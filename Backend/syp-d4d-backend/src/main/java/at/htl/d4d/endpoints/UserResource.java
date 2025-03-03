package at.htl.d4d.endpoints;

import at.htl.d4d.control.UserRepository;
import jakarta.inject.Inject;
import jakarta.ws.rs.Path;

@Path("/d4d")
public class UserResource {

    @Inject
    UserRepository userRepository;

    public UserResource() {
    }

}