package at.htl.service;

import io.quarkus.mailer.Mail;
import io.quarkus.mailer.reactive.ReactiveMailer;
import io.smallrye.mutiny.Uni;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

/**
 * Service für E-Mail-Benachrichtigungen.
 * Verwendet KeycloakUserService um Email-Adressen aus Keycloak-Daten zu konstruieren.
 */
@ApplicationScoped
public class NotificationService {

    private static final Logger LOG = Logger.getLogger(NotificationService.class);

    @Inject
    ReactiveMailer mailer;
    
    @Inject
    KeycloakUserService keycloakUserService;
    
    @ConfigProperty(name = "quarkus.mailer.from")
    String fromEmail;

    public NotificationService() {
        LOG.info("NotificationService initialized - using Keycloak for email addresses");
    }

    /**
     * Sendet eine Bestätigungs-E-Mail an den User (Schüler).
     * Email-Adresse wird aus Keycloak-Daten konstruiert.
     * 
     * @param pupilId Die Keycloak User-ID (pupilId aus User-Tabelle)
     * @return Uni<Void> für asynchrone Ausführung
     */
    public Uni<Void> sendConfirmationEmail(String pupilId) {
        String recipientEmail = keycloakUserService.getUserEmail(pupilId);
        
        if (recipientEmail == null) {
            LOG.error("Cannot send email: No email address for pupilId: " + pupilId);
            return Uni.createFrom().voidItem();
        }
        
        LOG.info("Sending confirmation email for pupilId: " + pupilId + " to: " + recipientEmail);

        String subject = "✅ Deine Nachhilfe-Anfrage wurde bestätigt!";
        String body = buildEmailBody();
        
        return mailer.send(
                Mail.withHtml(recipientEmail, subject, body)
                    .setFrom(fromEmail)
            )
            .onItem().invoke(() -> LOG.info("Confirmation email sent successfully to: " + recipientEmail))
            .onFailure().invoke(throwable -> 
                LOG.error("Failed to send confirmation email", throwable)
            )
            .replaceWithVoid();
    }

    /**
     * Sendet Bestätigung, dass Anfrage ERSTELLT wurde (an den Sender).
     * Email-Adresse wird aus Keycloak-Daten konstruiert.
     * 
     * @param pupilId Die Keycloak User-ID
     * @param providerName Name des Nachhilfelehrers
     * @param serviceTypeName Name des Fachs
     * @return Uni<Void>
     */
    public Uni<Void> sendRequestCreatedEmail(String pupilId, String providerName, String serviceTypeName) {
        String recipientEmail = keycloakUserService.getUserEmail(pupilId);
        
        if (recipientEmail == null) {
            LOG.error("Cannot send email: No email address for pupilId: " + pupilId);
            return Uni.createFrom().voidItem();
        }
        
        LOG.info("Sending request created email for pupilId: " + pupilId + " to: " + recipientEmail);

        String subject = "📨 Deine Nachhilfe-Anfrage wurde gesendet!";
        String body = buildRequestCreatedEmailBody(providerName, serviceTypeName);
        
        return mailer.send(Mail.withHtml(recipientEmail, subject, body).setFrom(fromEmail))
            .onItem().invoke(() -> LOG.info("Request created email sent to: " + recipientEmail))
            .onFailure().invoke(t -> LOG.error("Failed to send request created email", t))
            .replaceWithVoid();
    }

    /**
     * Erstellt den HTML-Body der Bestätigungs-E-Mail.
     * 
     * @return HTML-String
     */
    private String buildEmailBody() {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: ##333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .header {
                        background: linear-gradient(135deg, ##667eea 0%%, ##764ba2 100%%);
                        color: white;
                        padding: 20px;
                        text-align: center;
                        border-radius: 8px 8px 0 0;
                    }
                    .content {
                        background: ##f9f9f9;
                        padding: 30px;
                        border-radius: 0 0 8px 8px;
                    }
                    .button {
                        display: inline-block;
                        padding: 12px 24px;
                        background: ##667eea;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin-top: 20px;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 20px;
                        font-size: 12px;
                        color: ##666;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🎉 Anfrage bestätigt!</h1>
                </div>
                <div class="content">
                    <h2>Hallo!</h2>
                    <p>
                        Gute Nachrichten! Deine Nachhilfe-Anfrage wurde <strong>bestätigt</strong>.
                    </p>
                    <p>
                        Der Nachhilfelehrer hat deine Anfrage angenommen. Du kannst jetzt mit der Nachhilfe starten!
                    </p>
                    <p>
                        <a href="http://vm10.htl-leonding.ac.at" class="button">Zur Plattform</a>
                    </p>
                    <p>
                        Bei Fragen stehen wir dir gerne zur Verfügung.
                    </p>
                    <p>
                        Viel Erfolg beim Lernen!<br>
                        Dein D4D-Team
                    </p>
                </div>
                <div class="footer">
                    <p>
                        Diese E-Mail wurde automatisch generiert.<br>
                        HTL Leonding - Demand4Demand Tutoring Platform
                    </p>
                </div>
            </body>
            </html>
            """;
    }

    /**
     * Erstellt Email-Body wenn Anfrage ERSTELLT wurde.
     */
    private String buildRequestCreatedEmailBody(String providerName, String serviceTypeName) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: ##333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .header {
                        background: linear-gradient(135deg, ##4facfe 0%%, ##00f2fe 100%%);
                        color: white;
                        padding: 20px;
                        text-align: center;
                        border-radius: 8px 8px 0 0;
                    }
                    .content {
                        background: ##f9f9f9;
                        padding: 30px;
                        border-radius: 0 0 8px 8px;
                    }
                    .info-box {
                        background: white;
                        padding: 15px;
                        border-left: 4px solid ##4facfe;
                        margin: 20px 0;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 20px;
                        font-size: 12px;
                        color: ##666;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📨 Anfrage gesendet!</h1>
                </div>
                <div class="content">
                    <h2>Hallo!</h2>
                    <p>
                        Deine Nachhilfe-Anfrage wurde erfolgreich <strong>versendet</strong>!
                    </p>
                    
                    <div class="info-box">
                        <p><strong>📚 Fach:</strong> %s</p>
                        <p><strong>👨‍🏫 Lehrer:</strong> %s</p>
                    </div>
                    
                    <p>
                        Der Nachhilfelehrer wurde benachrichtigt und wird deine Anfrage prüfen.
                    </p>
                    <p>
                        Du erhältst eine weitere E-Mail, sobald die Anfrage bestätigt wurde.
                    </p>
                    
                    <p>
                        Viel Erfolg!<br>
                        Dein D4D-Team 🚀
                    </p>
                </div>
                <div class="footer">
                    <p>Dies ist eine automatische E-Mail von der D4D Tutoring Platform.</p>
                </div>
            </body>
            </html>
            """.formatted(serviceTypeName, providerName);
    }

    /**
     * Test-Methode für Debug-Zwecke.
     * Sendet eine Test-E-Mail an einen bestimmten User.
     * 
     * @param pupilId Keycloak User-ID
     * @return Uni<Void>
     */
    public Uni<Void> sendTestEmail(String pupilId) {
        LOG.info("Sending TEST email for pupilId: " + pupilId);
        return sendConfirmationEmail(pupilId);
    }
}
