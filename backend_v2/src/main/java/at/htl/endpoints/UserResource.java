package at.htl.endpoints;

import at.htl.entity.User;
import at.htl.repository.UserRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("user")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class UserResource {
    @Inject
    UserRepository userRepository;

    @GET
    @Path("/active")
    public Response getActiveUser() {
        User user = userRepository.getActiveUser();
        if (user == null) {
            return Response.status(Response.Status.NO_CONTENT).build();
        }
        return Response.ok(user).build();
    }

    @POST
    @Path("/active")
    @Transactional
    public Response setActiveUser(User user) {
        userRepository.setActiveUser(user);
        return Response.ok().build();
    }
}
