package at.htl.endpoints;

import at.htl.entity.Appointment;
import at.htl.repository.AppointmentRepository;
import at.htl.service.NotificationService;
import io.quarkus.mailer.Mail;
import io.quarkus.mailer.reactive.ReactiveMailer;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.util.HashMap;
import java.util.Map;

/**
 * Debug-Endpoint für E-Mail-Funktionalität
 */
@ApplicationScoped
@Path("debug/email")
@Produces(MediaType.APPLICATION_JSON)
public class EmailDebugResource {

    private static final Logger LOG = Logger.getLogger(EmailDebugResource.class);

    @Inject
    ReactiveMailer mailer;

    @Inject
    NotificationService notificationService;

    @Inject
    AppointmentRepository appointmentRepository;

    @ConfigProperty(name = "quarkus.mailer.from")
    String fromEmail;

    @ConfigProperty(name = "quarkus.mailer.host")
    String smtpHost;

    @ConfigProperty(name = "quarkus.mailer.port")
    Integer smtpPort;

    @ConfigProperty(name = "quarkus.mailer.username")
    String smtpUsername;

    /**
     * GET /debug/email/config
     * Zeigt die aktuelle E-Mail-Konfiguration
     */
    @GET
    @Path("/config")
    public Response getEmailConfig() {
        Map<String, String> config = new HashMap<>();
        config.put("from", fromEmail);
        config.put("host", smtpHost);
        config.put("port", String.valueOf(smtpPort));
        config.put("username", smtpUsername);
        config.put("password", "***configured***");
        
        LOG.info("Email configuration requested");
        return Response.ok(config).build();
    }

    /**
     * POST /debug/email/test?to=email@example.com
     * Sendet eine Test-E-Mail
     */
    @POST
    @Path("/test")
    public Response sendTestEmail(@QueryParam("to") String recipient) {
        if (recipient == null || recipient.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Parameter 'to' is required")
                    .build();
        }

        LOG.info("Sending test email to: " + recipient);

        String subject = "✅ Test-E-Mail von D4D";
        String body = """
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"></head>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h1 style="color: #10b981;">Test-E-Mail erfolgreich!</h1>
                <p>Diese Test-E-Mail wurde erfolgreich von der D4D Nachhilfebörse gesendet.</p>
                <p><strong>SMTP-Konfiguration:</strong></p>
                <ul>
                    <li>Host: %s</li>
                    <li>Port: %d</li>
                    <li>From: %s</li>
                    <li>Username: %s</li>
                </ul>
                <p>Zeitstempel: %s</p>
            </body>
            </html>
            """.formatted(smtpHost, smtpPort, fromEmail, smtpUsername, 
                         java.time.LocalDateTime.now().toString());

        try {
            mailer.send(Mail.withHtml(recipient, subject, body).setFrom(fromEmail))
                .await().indefinitely();
            
            LOG.info("Test email sent successfully to: " + recipient);
            return Response.ok(Map.of(
                "status", "success",
                "recipient", recipient,
                "from", fromEmail,
                "message", "Test email sent successfully"
            )).build();
            
        } catch (Exception e) {
            LOG.error("Failed to send test email", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of(
                        "status", "error",
                        "message", e.getMessage(),
                        "recipient", recipient
                    ))
                    .build();
        }
    }

    /**
     * POST /debug/email/appointment/{id}
     * Sendet die Bestätigungsmail für einen Termin erneut
     */
    @POST
    @Path("/appointment/{id}")
    @Transactional
    public Response resendAppointmentEmail(@PathParam("id") Long appointmentId) {
        Appointment appointment = appointmentRepository.findById(appointmentId);
        
        if (appointment == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("error", "Appointment not found"))
                    .build();
        }

        LOG.info("Resending confirmation emails for appointment: " + appointmentId);

        try {
            notificationService.sendAppointmentConfirmation(appointment);
            
            return Response.ok(Map.of(
                "status", "success",
                "appointmentId", appointmentId,
                "message", "Confirmation emails resent"
            )).build();
            
        } catch (Exception e) {
            LOG.error("Failed to resend appointment emails", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of(
                        "status", "error",
                        "message", e.getMessage()
                    ))
                    .build();
        }
    }

    /**
     * GET /debug/email/logs
     * Zeigt die letzten E-Mail-Log-Einträge
     */
    @GET
    @Path("/logs")
    public Response getEmailLogs() {
        return Response.ok(Map.of(
            "message", "Check backend container logs with: docker logs d4d-backend-v2 | grep -i 'mail\\|notification'",
            "info", "This endpoint returns basic status information"
        )).build();
    }
}
