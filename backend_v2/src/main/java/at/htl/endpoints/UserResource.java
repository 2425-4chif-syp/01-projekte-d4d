package at.htl.endpoints;

import at.htl.entity.User;
import at.htl.entity.Session;
import at.htl.repository.UserRepository;
import at.htl.repository.SessionRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.Cookie;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.NewCookie;
import java.util.Map;

@Path("user")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class UserResource {
    @Inject
    UserRepository userRepository;
    
    @Inject
    SessionRepository sessionRepository;

    @GET
    @Transactional
    public Response getActiveUser(@CookieParam("d4d_session_id") String sessionId) {
        // Kein Session-Cookie = nicht angemeldet
        if (sessionId == null || sessionId.isEmpty()) {
            return Response.status(Response.Status.NO_CONTENT).entity("").build();
        }
        
        // Hole Session
        Session session = sessionRepository.findByIdOrNull(sessionId);
        if (session == null) {
            return Response.status(Response.Status.NO_CONTENT).entity("").build();
        }
        
        // Hole User von Session
        User user = session.getUser();
        if (user == null || user.getName() == null) {
            // Session existiert aber ohne User = Gast-Modus
            return Response.ok("Gast-Modus").build();
        }
        
        return Response.ok(user.getName()).build();
    }

    @POST
    @Transactional
    public Response setActiveUser(@CookieParam("d4d_session_id") String sessionId, 
                                  Map<String, String> body) {
        String username = body.get("username");
        
        if (username == null || username.trim().isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Benutzername darf nicht leer sein")
                    .build();
        }

        User user = userRepository.find("name", username).firstResult();

        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Benutzer '" + username + "' existiert nicht")
                    .build();
        }
        
        // Hole oder erstelle Session
        Session session;
        if (sessionId == null || sessionId.isEmpty()) {
            // Keine Session vorhanden - erstelle neue
            session = new Session(java.util.UUID.randomUUID().toString());
            sessionRepository.persist(session);
        } else {
            session = sessionRepository.findByIdOrNull(sessionId);
            if (session == null) {
                // Session abgelaufen - erstelle neue
                session = new Session(java.util.UUID.randomUUID().toString());
                sessionRepository.persist(session);
            }
        }
        
        // Verknüpfe User mit Session
        session.setUser(user);
        session.setAnonymous(false);
        sessionRepository.persist(session);
        
        // Setze Session-Cookie wenn neu erstellt
        NewCookie cookie = new NewCookie.Builder("d4d_session_id")
                .value(session.getId())
                .path("/")
                .maxAge(86400) // 24 Stunden
                .build();
        
        return Response.ok("")
                .cookie(cookie)
                .build();
    }
}
