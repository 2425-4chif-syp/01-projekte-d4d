package at.htl.endpoints;

import at.htl.entity.User;
import at.htl.repository.UserRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.Map;

@Path("user")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class UserResource {
    @Inject
    UserRepository userRepository;

    @GET
    @Transactional
    public Response getActiveUser() {
        User user = userRepository.getActiveUser();
        if (user == null || user.getName() == null) {
            return Response.status(Response.Status.NO_CONTENT).entity("").build();
        }
        return Response.ok(user.getName()).build();
    }

    @POST
    @Transactional
    public Response setActiveUser(String username) {
        if (username == null || username.trim().isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Benutzername darf nicht leer sein")
                    .build();
        }

        User user = userRepository.find("name", username).firstResult();

        if (user == null) {
            user = new User();
            user.setName(username);
            userRepository.persist(user);
        }
        
        userRepository.setActiveUser(user);
        return Response.ok("").build();
    }
}
