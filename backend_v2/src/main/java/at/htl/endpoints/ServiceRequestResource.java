package at.htl.endpoints;

import at.htl.endpoints.dto.ServiceRequestCreateDto;
import at.htl.endpoints.dto.ServiceRequestResponseDto;
import at.htl.entity.Market;
import at.htl.entity.Service;
import at.htl.entity.ServiceRequest;
import at.htl.entity.User;
import at.htl.repository.MarketRepository;
import at.htl.repository.ServiceRepository;
import at.htl.repository.ServiceRequestRepository;
import at.htl.repository.UserRepository;
import at.htl.service.NotificationService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;

import java.util.List;
import java.util.stream.Collectors;

@ApplicationScoped
@Path("service-requests")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ServiceRequestResource {

    private static final Logger LOG = Logger.getLogger(ServiceRequestResource.class);

    @Inject
    ServiceRequestRepository serviceRequestRepository;

    @Inject
    UserRepository userRepository;

    @Inject
    MarketRepository marketRepository;

    @Inject
    ServiceRepository serviceRepository;

    @Inject
    NotificationService notificationService;

    /**
     * Create a new service request
     * POST /service-requests
     */
    @POST
    @Transactional
    public Response createServiceRequest(ServiceRequestCreateDto dto) {
        // Validate sender
        User sender = userRepository.find("name", dto.senderUsername()).firstResult();
        if (sender == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Sender user not found")
                    .build();
        }

        // Validate market
        Market market = marketRepository.findById(dto.marketId());
        if (market == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Market not found")
                    .build();
        }

        // Get receiver from market
        User receiver = market.getUser();
        if (receiver == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Market has no owner")
                    .build();
        }

        // Prevent self-requests
        if (sender.getId().equals(receiver.getId())) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Cannot send request to yourself")
                    .build();
        }

        // Check if request already exists
        if (serviceRequestRepository.requestExists(sender, receiver, market.getId())) {
            return Response.status(Response.Status.CONFLICT)
                    .entity("Request already exists")
                    .build();
        }

        // Create and persist the request
        ServiceRequest request = new ServiceRequest(sender, receiver, market);
        serviceRequestRepository.persist(request);

        // ✉️ E-MAIL: Sende Bestätigung an Sender dass Anfrage versendet wurde
        if (sender.getPupilId() != null && !sender.getPupilId().isBlank()) {
            String providerName = receiver.getName();
            String serviceTypeName = market.getServiceType().getName();
            
            LOG.info("Sending request-created email to sender: " + sender.getName() + " (pupilId: " + sender.getPupilId() + ")");
            
            notificationService.sendRequestCreatedEmail(sender.getPupilId(), providerName, serviceTypeName)
                .subscribe()
                .with(
                    unused -> LOG.info("Request-created email queued for: " + sender.getName()),
                    failure -> LOG.error("Failed to send request-created email", failure)
                );
        } else {
            LOG.warn("Cannot send email: Sender has no pupilId");
        }

        return Response.status(Response.Status.CREATED)
                .entity(ServiceRequestResponseDto.fromEntity(request))
                .build();
    }

    /**
     * Get all service requests for the logged-in user (inbox)
     * GET /service-requests/inbox/{username}
     */
    @GET
    @Path("/inbox/{username}")
    @Transactional
    public Response getInbox(@PathParam("username") String username) {
        User user = userRepository.find("name", username).firstResult();
        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("User not found")
                    .build();
        }

        List<ServiceRequest> requests = serviceRequestRepository.findByReceiver(user);
        
        List<ServiceRequestResponseDto> dtos = requests.stream()
                .map(ServiceRequestResponseDto::fromEntity)
                .collect(Collectors.toList());

        return Response.ok(dtos).build();
    }

    /**
     * Get all service requests sent by the user
     * GET /service-requests/sent/{username}
     */
    @GET
    @Path("/sent/{username}")
    @Transactional
    public Response getSentRequests(@PathParam("username") String username) {
        User user = userRepository.find("name", username).firstResult();
        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("User not found")
                    .build();
        }

        List<ServiceRequest> requests = serviceRequestRepository.findBySender(user);
        
        List<ServiceRequestResponseDto> dtos = requests.stream()
                .map(ServiceRequestResponseDto::fromEntity)
                .collect(Collectors.toList());

        return Response.ok(dtos).build();
    }

    /**
     * Accept a service request
     * PUT /service-requests/{id}/accept
     */
    @PUT
    @Path("/{id}/accept")
    @Transactional
    public Response acceptRequest(@PathParam("id") Long id) {
        ServiceRequest request = serviceRequestRepository.findById(id);
        
        if (request == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Request not found")
                    .build();
        }

        if (!"PENDING".equals(request.getStatus())) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Request is not pending")
                    .build();
        }

        // Update status to ACCEPTED
        request.setStatus("ACCEPTED");
        serviceRequestRepository.persist(request);

        // Create a new Service
        Market providerMarket = request.getMarket(); // The market that was requested (the offer)
        User client = request.getSender(); // The user who sent the request
        
        // Try to find the client's corresponding market (their demand for the same service type)
        // This may or may not exist - if not, clientMarket will be null
        Market clientMarket = marketRepository.find(
            "user = ?1 AND serviceType = ?2 AND offer = 0",
            client,
            providerMarket.getServiceType()
        ).firstResult();
        
        // Create the service regardless of whether clientMarket exists
        // providerMarket = always the offer being requested
        // clientMarket = client's demand if they have one, null otherwise
        Service service = new Service(providerMarket, clientMarket);
        service.setStatus("ACTIVE");
        serviceRepository.persist(service);

        // ✉️ E-MAIL NOTIFICATION: Sende Bestätigung an den Schüler (sender)
        User sender = request.getSender();
        if (sender != null && sender.getPupilId() != null && !sender.getPupilId().isBlank()) {
            LOG.info("Sending confirmation email to sender (pupilId): " + sender.getPupilId());
            
            // Asynchroner E-Mail-Versand - blockiert den API-Call NICHT!
            notificationService.sendConfirmationEmail(sender.getPupilId())
                .subscribe()
                .with(
                    unused -> LOG.info("Email notification queued successfully for user: " + sender.getName()),
                    failure -> LOG.error("Failed to queue email notification for user: " + sender.getName(), failure)
                );
        } else {
            LOG.warn("Cannot send email: Sender has no pupilId. User: " + (sender != null ? sender.getName() : "null"));
        }

        return Response.ok(ServiceRequestResponseDto.fromEntity(request)).build();
    }

    /**
     * Reject a service request
     * PUT /service-requests/{id}/reject
     */
    @PUT
    @Path("/{id}/reject")
    @Transactional
    public Response rejectRequest(@PathParam("id") Long id) {
        ServiceRequest request = serviceRequestRepository.findById(id);
        
        if (request == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Request not found")
                    .build();
        }

        if (!"PENDING".equals(request.getStatus())) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Request is not pending")
                    .build();
        }

        // Update status to REJECTED
        request.setStatus("REJECTED");
        serviceRequestRepository.persist(request);

        return Response.ok(ServiceRequestResponseDto.fromEntity(request)).build();
    }
}
