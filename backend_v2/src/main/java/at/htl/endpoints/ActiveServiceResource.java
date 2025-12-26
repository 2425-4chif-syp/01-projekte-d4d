package at.htl.endpoints;

import at.htl.endpoints.dto.ServiceResponseDto;
import at.htl.entity.ChatEntry;
import at.htl.entity.Service;
import at.htl.entity.User;
import at.htl.repository.ChatEntryRepository;
import at.htl.repository.ServiceRepository;
import at.htl.repository.UserRepository;
import at.htl.service.NotificationService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;

import java.sql.Timestamp;
import java.util.List;
import java.util.stream.Collectors;

@ApplicationScoped
@Path("services")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ActiveServiceResource {

    private static final Logger LOG = Logger.getLogger(ActiveServiceResource.class);

    @Inject
    ServiceRepository serviceRepository;

    @Inject
    UserRepository userRepository;

    @Inject
    NotificationService notificationService;

    @Inject
    ChatEntryRepository chatEntryRepository;

    /**
     * Get all services for a user (as provider or client)
     * GET /services/my-services/{username}
     */
    @GET
    @Path("/my-services/{username}")
    @Transactional
    public Response getMyServices(@PathParam("username") String username) {
        User user = userRepository.findByPupilIdOrName(username);
        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("User not found")
                    .build();
        }

        // Find services where user is provider or client
        List<Service> services = serviceRepository.list(
            "marketProvider.user = ?1 OR marketClient.user = ?1",
            user
        );

        List<ServiceResponseDto> dtos = services.stream()
                .map(ServiceResponseDto::fromEntity)
                .collect(Collectors.toList());

        return Response.ok(dtos).build();
    }

    /**
     * Confirm service completion by user
     * PUT /services/{id}/confirm-complete/{username}
     */
    @PUT
    @Path("/{id}/confirm-complete/{username}")
    @Transactional
    public Response confirmServiceCompletion(@PathParam("id") Long id, @PathParam("username") String username) {
        Service service = serviceRepository.findById(id);
        
        if (service == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Service not found")
                    .build();
        }

        if ("COMPLETED".equals(service.getStatus()) || "CANCELLED".equals(service.getStatus())) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Service is already " + service.getStatus().toLowerCase())
                    .build();
        }

        User user = userRepository.findByPupilIdOrName(username);
        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("User not found")
                    .build();
        }

        // Check if user is provider or client
        boolean isProvider = service.getMarketProvider() != null && 
                            service.getMarketProvider().getUser().getId().equals(user.getId());
        boolean isClient = service.getMarketClient() != null && 
                          service.getMarketClient().getUser().getId().equals(user.getId());

        if (!isProvider && !isClient) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("User is not part of this service")
                    .build();
        }

        // Set confirmation flag
        if (isProvider) {
            service.setProviderConfirmed(true);
        } else {
            service.setClientConfirmed(true);
        }

        // Check if both confirmed
        if (service.getProviderConfirmed() && service.getClientConfirmed()) {
            service.setStatus("COMPLETED");
            service.setCompletedAt(new Timestamp(System.currentTimeMillis()));
            
            // Send completion notification to BOTH parties
            LOG.info("Service completed - sending notifications to both parties");
            notificationService.sendServiceCompletedNotification(service);
            
            // Create system chat message for completion
            User provider = service.getMarketProvider().getUser();
            User client = service.getMarketClient() != null ? service.getMarketClient().getUser() : null;
            String serviceTypeName = service.getMarketProvider().getServiceType().getName();
            
            if (client != null) {
                // Message from system to client (with review hint)
                ChatEntry clientMsg = new ChatEntry();
                clientMsg.setSender(provider);
                clientMsg.setReceiver(client);
                clientMsg.setMessage("<<<SYSTEM>>> 🎉 Die Nachhilfe in " + serviceTypeName + " wurde erfolgreich abgeschlossen! Vielen Dank für die Zusammenarbeit. ⭐ Vergiss nicht, eine Bewertung abzugeben!");
                clientMsg.setTime(new Timestamp(System.currentTimeMillis()));
                chatEntryRepository.persist(clientMsg);
                
                // Message from system to provider
                ChatEntry providerMsg = new ChatEntry();
                providerMsg.setSender(client);
                providerMsg.setReceiver(provider);
                providerMsg.setMessage("<<<SYSTEM>>> 🎉 Die Nachhilfe in " + serviceTypeName + " wurde erfolgreich abgeschlossen! Vielen Dank für dein Engagement. Du hast einem Mitschüler geholfen! 🌟");
                providerMsg.setTime(new Timestamp(System.currentTimeMillis() + 1)); // +1ms to ensure order
                chatEntryRepository.persist(providerMsg);
            }
            
        } else if (service.getProviderConfirmed() || service.getClientConfirmed()) {
            // One confirmed, waiting for other
            service.setStatus("PENDING_COMPLETION");
            
            // Send pending notification to the OTHER user (not the one who just confirmed)
            User otherUser = isProvider 
                ? service.getMarketClient().getUser() 
                : service.getMarketProvider().getUser();
            
            LOG.info("One party confirmed - sending pending notification to: " + otherUser.getName());
            notificationService.sendCompletionPendingNotification(service, user, otherUser);
        }

        serviceRepository.persist(service);

        return Response.ok(ServiceResponseDto.fromEntity(service)).build();
    }

    /**
     * Complete a service (old method - kept for compatibility)
     * PUT /services/{id}/complete
     */
    @PUT
    @Path("/{id}/complete")
    @Transactional
    public Response completeService(@PathParam("id") Long id) {
        Service service = serviceRepository.findById(id);
        
        if (service == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Service not found")
                    .build();
        }

        if (!"ACTIVE".equals(service.getStatus())) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Service is not active")
                    .build();
        }

        service.setStatus("COMPLETED");
        service.setCompletedAt(new Timestamp(System.currentTimeMillis()));
        serviceRepository.persist(service);

        return Response.ok(ServiceResponseDto.fromEntity(service)).build();
    }

    /**
     * Cancel a service
     * PUT /services/{id}/cancel
     */
    @PUT
    @Path("/{id}/cancel")
    @Transactional
    public Response cancelService(@PathParam("id") Long id) {
        Service service = serviceRepository.findById(id);
        
        if (service == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Service not found")
                    .build();
        }

        if (!"ACTIVE".equals(service.getStatus())) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Service is not active")
                    .build();
        }

        service.setStatus("CANCELLED");
        service.setCompletedAt(new Timestamp(System.currentTimeMillis()));
        serviceRepository.persist(service);

        return Response.ok(ServiceResponseDto.fromEntity(service)).build();
    }
}
