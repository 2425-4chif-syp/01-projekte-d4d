package at.htl.d4d.endpoints;

import at.htl.d4d.control.ServiceRepository;
import at.htl.d4d.control.UserRepository;
import at.htl.d4d.entity.Service;
import at.htl.d4d.entity.User;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Response;

import java.util.List;


@Path("/d4d")
public class ServiceResource {
    @Inject
    ServiceRepository serviceRepository;

    @Inject
    UserRepository userRepository;

    @GET
    @Path("/{username}/services")
    public Response getUserServices(@PathParam("username") String username) {
        User user = userRepository.findUserByName(username);
        List<Service> services = serviceRepository.getServicesByUser(user);

        if (services.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(services).build();
    }
}