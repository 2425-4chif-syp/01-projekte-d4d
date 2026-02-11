package at.htl.endpoints;

import at.htl.service.NotificationService;
import io.smallrye.mutiny.Uni;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;

/**
 * Debug-Controller zum Testen der E-Mail-Benachrichtigungen.
 * Nur für Entwicklungs- und Testzwecke!
 * 
 * WICHTIG: In Produktion sollte dieser Endpoint deaktiviert oder entfernt werden!
 */
@ApplicationScoped
@Path("debug/notifications")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class DebugNotificationResource {

    private static final Logger LOG = Logger.getLogger(DebugNotificationResource.class);

    private final NotificationService notificationService;

    /**
     * Constructor Injection
     */
    public DebugNotificationResource(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    /**
     * Test-Endpoint zum manuellen Triggern einer E-Mail-Benachrichtigung.
     * 
     * POST /api/debug/notifications/test-mail/{pupilId}
     * 
     * Beispiel mit curl:
     * curl -X POST http://localhost:8080/api/debug/notifications/test-mail/abc-123-def-456
     * 
     * Oder via Swagger UI:
     * http://localhost:8080/q/swagger-ui
     * 
     * @param pupilId Die Keycloak User-ID (aus User.pupilId)
     * @return Response mit Status-Meldung
     */
    @POST
    @Path("/test-mail/{pupilId}")
    public Uni<Response> sendTestMail(@PathParam("pupilId") String pupilId) {
        LOG.info("DEBUG: Test mail requested for pupilId: " + pupilId);

        // Validierung
        if (pupilId == null || pupilId.isBlank()) {
            LOG.warn("DEBUG: Invalid pupilId provided");
            return Uni.createFrom().item(
                Response.status(Response.Status.BAD_REQUEST)
                    .entity(new ErrorResponse("pupilId cannot be empty"))
                    .build()
            );
        }

        // E-Mail asynchron senden
        return notificationService.sendTestEmail(pupilId)
            .onItem().transform(v -> {
                LOG.info("DEBUG: Test email sent successfully for pupilId: " + pupilId);
                return Response.ok(new SuccessResponse(
                    "Test email sent successfully to pupilId: " + pupilId
                )).build();
            })
            .onFailure().recoverWithItem(throwable -> {
                LOG.error("DEBUG: Failed to send test email for pupilId: " + pupilId, throwable);
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(new ErrorResponse(
                        "Failed to send email: " + throwable.getMessage()
                    ))
                    .build();
            });
    }

    /**
     * Info-Endpoint: Zeigt verfügbare Debug-Endpoints.
     * 
     * GET /api/debug/notifications
     */
    @GET
    public Response getInfo() {
        return Response.ok(new DebugInfo(
            "Debug Notification Endpoints",
            "POST /api/debug/notifications/test-mail/{pupilId} - Send test email"
        )).build();
    }

    // DTOs für saubere JSON-Responses
    public record ErrorResponse(String error) {}
    public record SuccessResponse(String message) {}
    public record DebugInfo(String description, String endpoint) {}
}
