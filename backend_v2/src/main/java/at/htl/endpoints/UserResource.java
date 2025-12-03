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
import io.quarkus.security.Authenticated;
import org.eclipse.microprofile.jwt.JsonWebToken;

@Path("user")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class UserResource {
    @Inject
    UserRepository userRepository;
    
    @Inject
    SessionRepository sessionRepository;

    @Inject
    JsonWebToken jwt;

    @POST
    @Path("keycloak")
    @Authenticated
    @Transactional
    public Response loginKeycloak(@CookieParam("d4d_session_id") String sessionId) {
        String pupilId = jwt.getClaim("preferred_username");
        String name = jwt.getClaim("name");
        
        if (pupilId == null) {
             return Response.status(Response.Status.BAD_REQUEST).entity("No pupil_id in token").build();
        }

        User user = userRepository.find("pupilId", pupilId).firstResult();
        if (user == null) {
            user = new User();
            user.setPupilId(pupilId);
            user.setName(name != null ? name : pupilId);
            userRepository.persist(user);
        } else {
            // Update name if changed
            if (name != null && !name.equals(user.getName())) {
                user.setName(name);
            }
        }

        // Session logic
        Session session;
        if (sessionId == null || sessionId.isEmpty()) {
            session = new Session(java.util.UUID.randomUUID().toString());
            sessionRepository.persist(session);
        } else {
            session = sessionRepository.findByIdOrNull(sessionId);
            if (session == null) {
                session = new Session(java.util.UUID.randomUUID().toString());
                sessionRepository.persist(session);
            }
        }
        
        session.setUser(user);
        session.setAnonymous(false);
        sessionRepository.persist(session);
        
        NewCookie cookie = new NewCookie.Builder("d4d_session_id")
                .value(session.getId())
                .path("/")
                .maxAge(86400) // 24 Stunden
                .build();
        
        return Response.ok(user.getName())
                .cookie(cookie)
                .build();
    }

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
