package at.htl.d4d.endpoints;

import at.htl.d4d.control.UserRepository;
import at.htl.d4d.entity.Service;
import at.htl.d4d.entity.User;
import jakarta.ws.rs.Produces;
import jakarta.inject.Inject;
import jakarta.json.JsonObject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/d4d")
public class UserResource {

    @Inject
    UserRepository userRepository;

    public UserResource() {
    }
    
    @POST
    @Path("/createUserIfNotExists")
    @Produces(MediaType.TEXT_PLAIN)
    @Transactional
        public Response createUser(JsonObject userJson) {
        String userName = userJson.getString("name");

        if (!userRepository.existsByName(userName)) {
            User newUser = new User(userName);
            userRepository.persist(newUser);
            return Response.ok("User created successfully!").build();
        }

        return Response.ok("Successfully").build();
    }
}