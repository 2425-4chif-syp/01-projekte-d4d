package at.htl.endpoints;

import at.htl.entity.User;
import at.htl.entity.Session;
import at.htl.repository.UserRepository;
import at.htl.repository.SessionRepository;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
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

    @POST
    @Path("keycloak")
    @Transactional
    public Response loginKeycloak(@CookieParam("d4d_session_id") String sessionId,
                                   @HeaderParam("Authorization") String authHeader) {
        System.out.println("=== Keycloak Login Request ===");
        System.out.println("Session ID: " + sessionId);
        System.out.println("Auth Header: " + (authHeader != null ? "Present" : "Missing"));
        
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                System.err.println("ERROR: No Bearer token provided");
                return Response.status(Response.Status.UNAUTHORIZED)
                        .entity("No Bearer token provided")
                        .build();
            }
            
            String token = authHeader.substring(7);
            String pupilId = null;
            String name = null;
            
            try {
                // Decode JWT token (base64)
                String[] parts = token.split("\\.");
                if (parts.length < 2) {
                    System.err.println("ERROR: Invalid JWT format - not enough parts");
                    return Response.status(Response.Status.BAD_REQUEST)
                            .entity("Invalid JWT token format")
                            .build();
                }
                
                String payload = new String(java.util.Base64.getUrlDecoder().decode(parts[1]));
                System.out.println("JWT Payload decoded successfully");
                
                // Parse JSON manually (simple approach)
                pupilId = extractJsonValue(payload, "preferred_username");
                name = extractJsonValue(payload, "name");
                
                System.out.println("Extracted pupilId: " + pupilId);
                System.out.println("Extracted name: " + name);
                
            } catch (Exception e) {
                System.err.println("ERROR: Exception during JWT decoding: " + e.getMessage());
                e.printStackTrace();
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity("Error decoding token: " + e.getMessage())
                        .build();
            }
            
            if (pupilId == null || pupilId.isEmpty()) {
                System.err.println("ERROR: No preferred_username found in token");
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity("No preferred_username in token")
                        .build();
            }

            User user = userRepository.find("pupilId", pupilId).firstResult();
            if (user == null) {
                System.out.println("Creating new user: " + pupilId);
                user = new User();
                user.setPupilId(pupilId);
                user.setName(name != null ? name : pupilId);
                userRepository.persist(user);
                System.out.println("User created with ID: " + user.getId());
            } else {
                System.out.println("User already exists: " + user.getId());
                // Update name if changed
                if (name != null && !name.equals(user.getName())) {
                    user.setName(name);
                    System.out.println("Updated user name to: " + name);
                }
            }

            // Session logic
            Session session;
            if (sessionId == null || sessionId.isEmpty()) {
                session = new Session(java.util.UUID.randomUUID().toString());
                sessionRepository.persist(session);
                System.out.println("Created new session: " + session.getId());
            } else {
                session = sessionRepository.findByIdOrNull(sessionId);
                if (session == null) {
                    session = new Session(java.util.UUID.randomUUID().toString());
                    sessionRepository.persist(session);
                    System.out.println("Created new session (old invalid): " + session.getId());
                } else {
                    System.out.println("Using existing session: " + session.getId());
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
            
            System.out.println("Login successful for user: " + user.getName());
            System.out.println("=== End Keycloak Login ===");
            
            return Response.ok(user.getName())
                    .cookie(cookie)
                    .build();
                    
        } catch (Exception e) {
            System.err.println("FATAL ERROR in loginKeycloak: " + e.getMessage());
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Internal server error: " + e.getMessage())
                    .build();
        }
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
    @Path("logout")
    @Transactional
    public Response logout(@CookieParam("d4d_session_id") String sessionId) {
        // Delete session from database if exists
        if (sessionId != null && !sessionId.isEmpty()) {
            Session session = sessionRepository.findByIdOrNull(sessionId);
            if (session != null) {
                sessionRepository.delete(session);
            }
        }
        
        // Clear session cookie by setting maxAge to 0
        NewCookie cookie = new NewCookie.Builder("d4d_session_id")
                .value("")
                .path("/")
                .maxAge(0) // Delete cookie
                .build();
        
        return Response.ok("Logged out")
                .cookie(cookie)
                .build();
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

        User user = userRepository.findByPupilIdOrName(username);

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
    
    private String extractJsonValue(String json, String key) {
        String search = "\"" + key + "\"";
        int start = json.indexOf(search);
        if (start == -1) return null;
        
        start = json.indexOf(":", start) + 1;
        start = json.indexOf("\"", start) + 1;
        int end = json.indexOf("\"", start);
        
        if (start == -1 || end == -1) return null;
        return json.substring(start, end);
    }
}
