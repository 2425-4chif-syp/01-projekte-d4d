package at.htl.endpoints;

import at.htl.endpoints.dto.ServiceResponseDto;
import at.htl.entity.Service;
import at.htl.entity.User;
import at.htl.repository.ServiceRepository;
import at.htl.repository.UserRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.sql.Timestamp;
import java.util.List;
import java.util.stream.Collectors;

@ApplicationScoped
@Path("services")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ActiveServiceResource {

    @Inject
    ServiceRepository serviceRepository;

    @Inject
    UserRepository userRepository;

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
        } else if (service.getProviderConfirmed() || service.getClientConfirmed()) {
            // One confirmed, waiting for other
            service.setStatus("PENDING_COMPLETION");
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
