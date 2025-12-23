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
     * Complete a service
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
