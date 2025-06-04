package at.htl.endpoints;

import at.htl.entity.Market;
import at.htl.entity.Service;
import at.htl.entity.User;
import at.htl.repository.ServiceRepository;
import at.htl.repository.UserRepository;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;

@Path("service")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ServiceResource {
    @Inject
    ServiceRepository serviceRepository;
    @Inject
    UserRepository userRepository;

    @GET
    @Path("/{username}")
    @Transactional
    public Response getServicesByUser(
            @PathParam("username") String username
    ) {
        User user = userRepository.find("name", username).firstResult();

        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        List<Service> services = serviceRepository.getServicesByUser(user);

        if (services == null || services.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(services).build();
    }

    @GET
    @Path("/perfect-matches/{username}")
    @Transactional
    public Response getPerfectMatches(
            @PathParam("username") String username
    ) {
        User user = userRepository.find("name", username).firstResult();

        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        List<Market> services = serviceRepository.getPerfectMatchesByUser(user);

        if (services == null || services.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(services).build();
    }

    @GET
    @Path("/relevant/{username}")
    @Transactional
    public Response getRelevantServicesForUser(
            @PathParam("username") String username
    ) {
        User user = userRepository.find("name", username).firstResult();

        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        List<Service> services = serviceRepository.getRelevantServicesForUser(user);

        if (services == null || services.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(services).build();
    }
}
