package at.htl.service;

import at.htl.entity.Appointment;
import at.htl.entity.Service;
import at.htl.entity.User;
import io.quarkus.mailer.Mail;
import io.quarkus.mailer.reactive.ReactiveMailer;
import io.smallrye.mutiny.Uni;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Service für E-Mail-Benachrichtigungen.
 * Verwendet KeycloakUserService um Email-Adressen aus Keycloak-Daten zu konstruieren.
 */
@ApplicationScoped
public class NotificationService {

    private static final Logger LOG = Logger.getLogger(NotificationService.class);
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd.MM.yyyy");
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter FULL_DATE_FORMAT = DateTimeFormatter.ofPattern("EEEE, dd. MMMM yyyy", Locale.GERMAN);

    @Inject
    ReactiveMailer mailer;
    
    @Inject
    KeycloakUserService keycloakUserService;
    
    @ConfigProperty(name = "quarkus.mailer.from")
    String fromEmail;

    @ConfigProperty(name = "app.base-url")
    String baseUrl;

    @ConfigProperty(name = "app.frontend.url")
    String frontendUrl;

    @ConfigProperty(name = "app.backend.url")
    String backendUrl;

    @ConfigProperty(name = "app.name")
    String appName;

    @ConfigProperty(name = "app.email-domain")
    String emailDomain;

    public NotificationService() {
        LOG.info("NotificationService initialized - using Keycloak for email addresses");
    }

    // ==================== SERVICE REQUEST NOTIFICATIONS ====================

    /**
     * Sendet E-Mail an den Empfänger wenn er eine neue Anfrage erhält.
     * Verwendet das gleiche Pattern wie sendServiceCreatedNotification (getEmailForUser + sendEmail).
     * 
     * @param receiver Der Provider der die Anfrage erhält
     * @param sender Der Schüler der die Anfrage gesendet hat
     * @param serviceTypeName Name des Fachs
     */
    public void sendServiceRequestReceived(User receiver, User sender, String serviceTypeName) {
        LOG.info("Sending service request received email to: " + receiver.getName());
        
        String recipientEmail = getEmailForUser(receiver);
        String subject = "🔔 Neue Nachhilfe-Anfrage von " + sender.getName();
        
        String htmlContent = buildBaseEmail(
            "🔔 Neue Anfrage erhalten!",
            "#f59e0b", "#d97706",
            receiver.getName(),
            String.format("<strong>%s</strong> möchte Nachhilfe in <strong>%s</strong> von dir!", sender.getName(), serviceTypeName),
            """
                <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 5px 0; color: #92400e;"><strong>📚 Fach:</strong> %s</p>
                    <p style="margin: 5px 0; color: #92400e;"><strong>👤 Schüler:</strong> %s</p>
                </div>
                <p style="color: #4b5563;">Gehe zur Plattform, um die Anfrage anzunehmen oder abzulehnen.</p>
            """.formatted(serviceTypeName, sender.getName()),
            baseUrl, "Anfrage ansehen"
        );

        sendEmail(recipientEmail, subject, htmlContent);
    }

    /**
     * Sendet Bestätigung an den Sender, dass seine Anfrage versendet wurde.
     * Verwendet das gleiche Pattern wie sendServiceCreatedNotification (getEmailForUser + sendEmail).
     *
     * @param sender Der Benutzer der die Anfrage gesendet hat
     * @param receiver Der Benutzer an den die Anfrage geht
     * @param serviceTypeName Name des Fachs
     */
    public void sendServiceRequestCreatedNotification(User sender, User receiver, String serviceTypeName) {
        LOG.info("Sending service request created email to sender: " + sender.getName());

        String recipientEmail = getEmailForUser(sender);
        String subject = "📨 Deine Nachhilfe-Anfrage wurde gesendet!";

        String htmlContent = buildBaseEmail(
            "📨 Anfrage gesendet!",
            "#4facfe", "#00f2fe",
            sender.getName(),
            String.format("Deine Anfrage für <strong>%s</strong> wurde an <strong>%s</strong> gesendet!", serviceTypeName, receiver.getName()),
            """
                <div style="background: #e0f2fe; border: 2px solid #4facfe; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 5px 0; color: #0369a1;"><strong>📚 Fach:</strong> %s</p>
                    <p style="margin: 5px 0; color: #0369a1;"><strong>👨‍🏫 Anbieter:</strong> %s</p>
                </div>
                <p style="color: #4b5563;">Du erhältst eine weitere E-Mail, sobald die Anfrage bestätigt wurde.</p>
            """.formatted(serviceTypeName, receiver.getName()),
            baseUrl, "Zur Plattform"
        );

        sendEmail(recipientEmail, subject, htmlContent);
    }

    /**
     * Sendet Benachrichtigung an den Empfänger, dass er eine neue Anfrage erhalten hat.
     * Verwendet das gleiche Pattern wie sendServiceCreatedNotification (getEmailForUser + sendEmail).
     *
     * @param receiver Der Provider der die Anfrage erhält
     * @param sender Der Schüler der die Anfrage gesendet hat
     * @param serviceTypeName Name des Fachs
     */
    public void sendServiceRequestReceivedNotification(User receiver, User sender, String serviceTypeName) {
        LOG.info("Sending service request received notification to: " + receiver.getName());

        String recipientEmail = getEmailForUser(receiver);
        String subject = "🔔 Neue Nachhilfe-Anfrage von " + sender.getName();

        String htmlContent = buildBaseEmail(
            "🔔 Neue Anfrage erhalten!",
            "#f59e0b", "#d97706",
            receiver.getName(),
            String.format("<strong>%s</strong> möchte Nachhilfe in <strong>%s</strong> von dir!", sender.getName(), serviceTypeName),
            """
                <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 5px 0; color: #92400e;"><strong>📚 Fach:</strong> %s</p>
                    <p style="margin: 5px 0; color: #92400e;"><strong>👤 Schüler:</strong> %s</p>
                </div>
                <p style="color: #4b5563;">Gehe zur Plattform, um die Anfrage anzunehmen oder abzulehnen.</p>
            """.formatted(serviceTypeName, sender.getName()),
            baseUrl, "Anfrage ansehen"
        );

        sendEmail(recipientEmail, subject, htmlContent);
    }

    /**
     * Sendet E-Mails an BEIDE Parteien wenn eine Anfrage angenommen wird und ein Service erstellt wird.
     * 
     * @param service Der erstellte Service
     */
    public void sendServiceCreatedNotification(Service service) {
        sendServiceCreatedNotification(service, null);
    }

    /**
     * Overload that accepts an explicit client user (for when clientMarket is null).
     */
    public void sendServiceCreatedNotification(Service service, User explicitClient) {
        LOG.info("Sending service created emails for service: " + service.getId());
        
        User provider = service.getMarketProvider().getUser();
        User client = service.getMarketClient() != null ? service.getMarketClient().getUser() : explicitClient;
        String serviceTypeName = service.getMarketProvider().getServiceType().getName();
        
        // E-Mail an den Client (Schüler der die Anfrage gesendet hat)
        if (client != null) {
            String recipientEmail = getEmailForUser(client);
            String subject = "✅ Deine Nachhilfe-Anfrage wurde angenommen!";
            
            String htmlContent = buildBaseEmail(
                "🎉 Anfrage angenommen!",
                "#10b981", "#059669",
                client.getName(),
                String.format("<strong>%s</strong> hat deine Anfrage für <strong>%s</strong> angenommen!", provider.getName(), serviceTypeName),
                """
                    <div style="background: #ecfdf5; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <p style="margin: 5px 0; color: #065f46;"><strong>📚 Fach:</strong> %s</p>
                        <p style="margin: 5px 0; color: #065f46;"><strong>👨‍🏫 Nachhilfelehrer:</strong> %s</p>
                    </div>
                    <p style="color: #4b5563;">Du kannst jetzt über den Chat Kontakt aufnehmen und Termine vereinbaren!</p>
                """.formatted(serviceTypeName, provider.getName()),
                baseUrl + "/chats", "Zum Chat"
            );

            sendEmail(recipientEmail, subject, htmlContent);
        }
        
        // E-Mail an den Provider (Nachhilfelehrer)
        String providerEmail = getEmailForUser(provider);
        String providerSubject = "✅ Du hast eine Nachhilfe-Anfrage angenommen!";
        
        String clientName = client != null ? client.getName() : "Ein Schüler";
        
        String providerHtml = buildBaseEmail(
            "✅ Anfrage angenommen!",
            "#10b981", "#059669",
            provider.getName(),
            String.format("Du hast die Anfrage von <strong>%s</strong> für <strong>%s</strong> angenommen!", clientName, serviceTypeName),
            """
                <div style="background: #ecfdf5; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 5px 0; color: #065f46;"><strong>📚 Fach:</strong> %s</p>
                    <p style="margin: 5px 0; color: #065f46;"><strong>👤 Schüler:</strong> %s</p>
                </div>
                <p style="color: #4b5563;">Kontaktiere deinen Schüler über den Chat, um Details zu besprechen!</p>
            """.formatted(serviceTypeName, clientName),
            baseUrl + "/chats", "Zum Chat"
        );

        sendEmail(providerEmail, providerSubject, providerHtml);
    }

    // ==================== SERVICE COMPLETION NOTIFICATIONS ====================

    /**
     * Sendet E-Mail an den ANDEREN User wenn einer auf "Fertigstellen" drückt.
     * Dies ist eine Erinnerung für den anderen User, ebenfalls zu bestätigen.
     * 
     * @param service Der Service der fertiggestellt werden soll
     * @param confirmedBy Der User der gerade bestätigt hat
     * @param otherUser Der andere User der noch bestätigen muss
     */
    public void sendCompletionPendingNotification(Service service, User confirmedBy, User otherUser) {
        LOG.info("Sending completion pending email to: " + otherUser.getName());
        
        String recipientEmail = getEmailForUser(otherUser);
        String serviceTypeName = service.getMarketProvider().getServiceType().getName();
        String subject = "⏳ " + confirmedBy.getName() + " hat die Nachhilfe als abgeschlossen markiert";
        
        String htmlContent = buildBaseEmail(
            "⏳ Fertigstellung bestätigen",
            "#8b5cf6", "#7c3aed",
            otherUser.getName(),
            String.format("<strong>%s</strong> hat die Nachhilfe in <strong>%s</strong> als abgeschlossen markiert.", confirmedBy.getName(), serviceTypeName),
            """
                <div style="background: #f5f3ff; border: 2px solid #8b5cf6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 5px 0; color: #5b21b6;"><strong>📚 Fach:</strong> %s</p>
                    <p style="margin: 5px 0; color: #5b21b6;"><strong>👤 Partner:</strong> %s</p>
                </div>
                <p style="color: #4b5563;">Bitte bestätige auch du die Fertigstellung, damit der Service abgeschlossen werden kann.</p>
            """.formatted(serviceTypeName, confirmedBy.getName()),
            baseUrl + "/showUserServices.html", "Jetzt bestätigen"
        );

        sendEmail(recipientEmail, subject, htmlContent);
    }

    /**
     * Sendet E-Mails an BEIDE wenn der Service komplett fertiggestellt wurde.
     * Der Client (Schüler) bekommt einen Hinweis, dass er den Provider bewerten kann.
     * 
     * @param service Der fertiggestellte Service
     */
    public void sendServiceCompletedNotification(Service service) {
        LOG.info("Sending service completed emails for service: " + service.getId());
        
        User provider = service.getMarketProvider().getUser();
        User client = service.getMarketClient() != null ? service.getMarketClient().getUser() : null;
        String serviceTypeName = service.getMarketProvider().getServiceType().getName();
        
        // E-Mail an den Provider (ohne Bewertungshinweis)
        String providerEmail = getEmailForUser(provider);
        String providerSubject = "🎉 Nachhilfe erfolgreich abgeschlossen!";
        
        String clientName = client != null ? client.getName() : "Dein Schüler";
        
        String providerHtml = buildBaseEmail(
            "🎉 Nachhilfe abgeschlossen!",
            "#10b981", "#059669",
            provider.getName(),
            String.format("Die Nachhilfe in <strong>%s</strong> mit <strong>%s</strong> wurde erfolgreich abgeschlossen!", serviceTypeName, clientName),
            """
                <div style="background: #ecfdf5; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 5px 0; color: #065f46;"><strong>📚 Fach:</strong> %s</p>
                    <p style="margin: 5px 0; color: #065f46;"><strong>👤 Schüler:</strong> %s</p>
                    <p style="margin: 5px 0; color: #065f46;"><strong>✅ Status:</strong> Erfolgreich abgeschlossen</p>
                </div>
                <p style="color: #4b5563;">Vielen Dank für dein Engagement! Du hast einem Mitschüler geholfen. 🌟</p>
            """.formatted(serviceTypeName, clientName),
            baseUrl + "/showUserServices.html", "Meine Services ansehen"
        );

        sendEmail(providerEmail, providerSubject, providerHtml);
        
        // E-Mail an den Client (MIT Bewertungshinweis)
        if (client != null) {
            String clientEmail = getEmailForUser(client);
            String clientSubject = "🎉 Nachhilfe erfolgreich abgeschlossen - Jetzt bewerten!";
            
            String clientHtml = buildBaseEmail(
                "🎉 Nachhilfe abgeschlossen!",
                "#10b981", "#059669",
                client.getName(),
                String.format("Die Nachhilfe in <strong>%s</strong> mit <strong>%s</strong> wurde erfolgreich abgeschlossen!", serviceTypeName, provider.getName()),
                """
                    <div style="background: #ecfdf5; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <p style="margin: 5px 0; color: #065f46;"><strong>📚 Fach:</strong> %s</p>
                        <p style="margin: 5px 0; color: #065f46;"><strong>👨‍🏫 Nachhilfelehrer:</strong> %s</p>
                        <p style="margin: 5px 0; color: #065f46;"><strong>✅ Status:</strong> Erfolgreich abgeschlossen</p>
                    </div>
                    
                    <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <p style="margin: 0; color: #92400e; font-weight: 600;">⭐ Bewerte jetzt deinen Nachhilfelehrer!</p>
                        <p style="margin: 10px 0 0 0; color: #92400e;">Deine Bewertung hilft anderen Schülern, den passenden Nachhilfelehrer zu finden.</p>
                    </div>
                """.formatted(serviceTypeName, provider.getName()),
                baseUrl + "/showUserServices.html", "Jetzt bewerten"
            );

            sendEmail(clientEmail, clientSubject, clientHtml);
        }
    }

    // ==================== APPOINTMENT NOTIFICATIONS ====================

    /**
     * Sendet Terminbestätigungs-E-Mails an BEIDE Teilnehmer (Tutor und Schüler).
     * Beide E-Mails enthalten einen Link zum ICS-Download.
     * 
     * @param appointment Der bestätigte Termin
     */
    public void sendAppointmentConfirmation(Appointment appointment) {
        LOG.info("Sending appointment confirmation emails for appointment: " + appointment.getId());

        try {
            // E-Mail an den Proposer (der den Termin vorgeschlagen hat)
            sendAppointmentConfirmationToUser(appointment, appointment.getProposer(), true);

            // E-Mail an den Recipient (der den Termin bestätigt hat)
            sendAppointmentConfirmationToUser(appointment, appointment.getRecipient(), false);

            LOG.info("Successfully sent confirmation emails for appointment: " + appointment.getId());

        } catch (Exception e) {
            LOG.error("Failed to send confirmation emails for appointment " + appointment.getId() + ": " + e.getMessage(), e);
        }
    }

    /**
     * Sendet eine Terminbestätigungs-E-Mail an einen einzelnen Benutzer.
     */
    private void sendAppointmentConfirmationToUser(Appointment appointment, User user, boolean isProposer) {
        String recipientEmail = getEmailForUser(user);
        String otherUser = isProposer ? appointment.getRecipient().getName() : appointment.getProposer().getName();
        
        String subject = String.format("✅ Termin bestätigt: %s am %s",
                appointment.getTitle(),
                appointment.getStartTime().format(DATE_FORMAT));

        String htmlContent = buildAppointmentConfirmationEmail(appointment, user, otherUser, isProposer);

        try {
            mailer.send(Mail.withHtml(recipientEmail, subject, htmlContent).setFrom(fromEmail))
                .onItem().invoke(() -> LOG.info("Appointment confirmation email sent to: " + recipientEmail))
                .onFailure().invoke(t -> LOG.error("Failed to send appointment confirmation email to " + recipientEmail, t))
                .subscribe().with(v -> {}, t -> LOG.error("Email send error", t));
        } catch (Exception e) {
            LOG.error("Failed to send appointment confirmation email to " + recipientEmail + ": " + e.getMessage(), e);
        }
    }

    /**
     * Erstellt die HTML-E-Mail für die Terminbestätigung mit ICS-Download-Link.
     */
    private String buildAppointmentConfirmationEmail(Appointment appointment, User recipient, String otherUser, boolean isProposer) {
        // ICS-Download geht zum Backend API
        String icsDownloadUrl = backendUrl + "/appointments/" + appointment.getId() + "/ics";
        // Portal-Link geht zum Frontend
        String portalUrl = frontendUrl + "/calendar";

        String role = isProposer ? "Dein Terminvorschlag wurde angenommen" : "Du hast den Termin bestätigt";
        
        String locationSection = "";
        if (appointment.getLocation() != null && !appointment.getLocation().isEmpty()) {
            locationSection = """
                <div style="margin-bottom: 15px;">
                    <span style="font-size: 24px; margin-right: 10px;">📍</span>
                    <span style="color: #1f2937; font-size: 16px;">Ort: <strong>%s</strong></span>
                </div>
                """.formatted(appointment.getLocation());
        }

        String notesSection = "";
        if (appointment.getNotes() != null && !appointment.getNotes().isEmpty()) {
            notesSection = """
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #86efac;">
                    <span style="font-size: 14px; color: #059669;">📝 Notizen:</span>
                    <p style="margin: 5px 0 0 0; color: #4b5563;">%s</p>
                </div>
                """.formatted(appointment.getNotes());
        }

        return """
            <!DOCTYPE html>
            <html lang="de">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Terminbestätigung</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
                <table width="100%%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
                    <tr>
                        <td align="center">
                            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                                
                                <!-- Header -->
                                <tr>
                                    <td style="background: linear-gradient(135deg, #10b981 0%%, #059669 100%%); padding: 30px; text-align: center;">
                                        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">✅ Termin bestätigt!</h1>
                                        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">%s</p>
                                    </td>
                                </tr>
                                
                                <!-- Greeting -->
                                <tr>
                                    <td style="padding: 30px 30px 20px 30px;">
                                        <p style="font-size: 18px; color: #1f2937; margin: 0;">
                                            Hallo <strong>%s</strong>,
                                        </p>
                                        <p style="font-size: 16px; color: #4b5563; margin: 15px 0 0 0;">
                                            %s! Hier sind die Details:
                                        </p>
                                    </td>
                                </tr>
                                
                                <!-- Appointment Details Card -->
                                <tr>
                                    <td style="padding: 0 30px;">
                                        <table width="100%%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; overflow: hidden;">
                                            <tr>
                                                <td style="padding: 25px;">
                                                    <!-- Title -->
                                                    <div style="margin-bottom: 20px;">
                                                        <span style="font-size: 14px; color: #059669; text-transform: uppercase; font-weight: 600;">Termin</span>
                                                        <h2 style="margin: 5px 0 0 0; font-size: 24px; color: #1f2937;">%s</h2>
                                                    </div>
                                                    
                                                    <!-- Date & Time -->
                                                    <div style="margin-bottom: 15px;">
                                                        <span style="font-size: 24px; margin-right: 10px;">📅</span>
                                                        <span style="color: #1f2937; font-size: 16px;">
                                                            <strong>%s</strong><br>
                                                            <span style="color: #4b5563;">%s - %s Uhr</span>
                                                        </span>
                                                    </div>
                                                    
                                                    <!-- Partner -->
                                                    <div style="margin-bottom: 15px;">
                                                        <span style="font-size: 24px; margin-right: 10px;">👤</span>
                                                        <span style="color: #1f2937; font-size: 16px;">Mit: <strong>%s</strong></span>
                                                    </div>
                                                    
                                                    %s
                                                    %s
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                
                                <!-- Calendar Button -->
                                <tr>
                                    <td style="padding: 30px; text-align: center;">
                                        <p style="color: #4b5563; margin: 0 0 20px 0; font-size: 16px;">
                                            Füge den Termin mit einem Klick zu deinem Kalender hinzu:
                                        </p>
                                        <a href="%s" 
                                           style="display: inline-block; 
                                                  background: linear-gradient(135deg, #3b82f6 0%%, #2563eb 100%%); 
                                                  color: #ffffff; 
                                                  text-decoration: none; 
                                                  padding: 16px 32px; 
                                                  border-radius: 8px; 
                                                  font-size: 18px; 
                                                  font-weight: 600;
                                                  box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
                                            📅 In Kalender eintragen
                                        </a>
                                        <p style="color: #9ca3af; margin: 15px 0 0 0; font-size: 12px;">
                                            Funktioniert mit: iOS, Android, Outlook, Google Calendar
                                        </p>
                                    </td>
                                </tr>
                                
                                <!-- Portal Link -->
                                <tr>
                                    <td style="padding: 0 30px 30px 30px; text-align: center;">
                                        <a href="%s" 
                                           style="color: #3b82f6; text-decoration: none; font-size: 14px;">
                                            Alle Termine im Portal anzeigen →
                                        </a>
                                    </td>
                                </tr>
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
                                        <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">
                                            Diese E-Mail wurde automatisch von der<br>
                                            <strong>%s</strong> versendet.
                                        </p>
                                        <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
                                            Bei Fragen oder Problemen wende dich an deinen Lernpartner.
                                        </p>
                                    </td>
                                </tr>
                                
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """.formatted(
                appName,
                recipient.getName(),
                role,
                appointment.getTitle(),
                appointment.getStartTime().format(FULL_DATE_FORMAT),
                appointment.getStartTime().format(TIME_FORMAT),
                appointment.getEndTime().format(TIME_FORMAT),
                otherUser,
                locationSection,
                notesSection,
                icsDownloadUrl,
                portalUrl,
                appName
            );
    }

    /**
     * Sendet eine Terminanfrage-Benachrichtigung an den Empfänger.
     */
    public void sendAppointmentRequest(Appointment appointment) {
        LOG.info("Sending appointment request notification for: " + appointment.getId());

        String recipientEmail = getEmailForUser(appointment.getRecipient());
        String portalUrl = baseUrl + "/chats";
        
        String subject = String.format("📅 Neue Terminanfrage von %s",
                appointment.getProposer().getName());

        String htmlContent = """
            <!DOCTYPE html>
            <html lang="de">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
                <table width="100%%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
                    <tr>
                        <td align="center">
                            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                                
                                <!-- Header -->
                                <tr>
                                    <td style="background: linear-gradient(135deg, #f59e0b 0%%, #d97706 100%%); padding: 30px; text-align: center;">
                                        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">📅 Neue Terminanfrage</h1>
                                    </td>
                                </tr>
                                
                                <!-- Content -->
                                <tr>
                                    <td style="padding: 30px;">
                                        <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px 0;">
                                            Hallo <strong>%s</strong>,
                                        </p>
                                        <p style="font-size: 16px; color: #4b5563; margin: 0 0 20px 0;">
                                            <strong>%s</strong> hat dir einen Termin vorgeschlagen:
                                        </p>
                                        
                                        <!-- Appointment Card -->
                                        <table width="100%%" style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px;">
                                            <tr>
                                                <td style="padding: 20px;">
                                                    <h3 style="margin: 0 0 10px 0; color: #1f2937;">%s</h3>
                                                    <p style="margin: 5px 0; color: #4b5563;">📅 %s</p>
                                                    <p style="margin: 5px 0; color: #4b5563;">⏰ %s - %s Uhr</p>
                                                    %s
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <p style="margin: 25px 0; text-align: center;">
                                            <a href="%s" style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                                                Im Portal antworten
                                            </a>
                                        </p>
                                    </td>
                                </tr>
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                                        <p style="margin: 0; color: #6b7280; font-size: 14px;">%s</p>
                                    </td>
                                </tr>
                                
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """.formatted(
                appointment.getRecipient().getName(),
                appointment.getProposer().getName(),
                appointment.getTitle(),
                appointment.getStartTime().format(FULL_DATE_FORMAT),
                appointment.getStartTime().format(TIME_FORMAT),
                appointment.getEndTime().format(TIME_FORMAT),
                appointment.getLocation() != null ? "<p style='margin: 5px 0; color: #4b5563;'>📍 " + appointment.getLocation() + "</p>" : "",
                portalUrl,
                appName
            );

        try {
            mailer.send(Mail.withHtml(recipientEmail, subject, htmlContent).setFrom(fromEmail))
                .onItem().invoke(() -> LOG.info("Appointment request notification sent to: " + recipientEmail))
                .onFailure().invoke(t -> LOG.error("Failed to send appointment request email", t))
                .subscribe().with(v -> {}, t -> LOG.error("Email send error", t));
        } catch (Exception e) {
            LOG.error("Failed to send appointment request email: " + e.getMessage(), e);
        }
    }

    /**
     * Sendet eine Ablehnungs-Benachrichtigung für einen Termin.
     */
    public void sendAppointmentRejection(Appointment appointment) {
        LOG.info("Sending appointment rejection notification for: " + appointment.getId());

        String recipientEmail = getEmailForUser(appointment.getProposer());
        
        String subject = String.format("❌ Termin abgelehnt: %s", appointment.getTitle());

        String htmlContent = """
            <!DOCTYPE html>
            <html lang="de">
            <body style="font-family: 'Segoe UI', sans-serif; background-color: #f5f5f5; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="background: linear-gradient(135deg, #ef4444 0%%, #dc2626 100%%); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">❌ Termin abgelehnt</h1>
                    </div>
                    <div style="padding: 30px;">
                        <p>Hallo <strong>%s</strong>,</p>
                        <p><strong>%s</strong> hat deinen Terminvorschlag leider abgelehnt:</p>
                        <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 20px; margin: 20px 0;">
                            <h3 style="margin: 0 0 10px 0;">%s</h3>
                            <p style="margin: 0;">📅 %s, %s - %s Uhr</p>
                        </div>
                        <p>Du kannst gerne einen neuen Terminvorschlag senden.</p>
                    </div>
                    <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0; color: #6b7280; font-size: 14px;">%s</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(
                appointment.getProposer().getName(),
                appointment.getRecipient().getName(),
                appointment.getTitle(),
                appointment.getStartTime().format(DATE_FORMAT),
                appointment.getStartTime().format(TIME_FORMAT),
                appointment.getEndTime().format(TIME_FORMAT),
                appName
            );

        try {
            mailer.send(Mail.withHtml(recipientEmail, subject, htmlContent).setFrom(fromEmail))
                .onItem().invoke(() -> LOG.info("Rejection notification sent to: " + recipientEmail))
                .onFailure().invoke(t -> LOG.error("Failed to send rejection email", t))
                .subscribe().with(v -> {}, t -> LOG.error("Email send error", t));
        } catch (Exception e) {
            LOG.error("Failed to send rejection email: " + e.getMessage(), e);
        }
    }

    /**
     * Ermittelt die E-Mail-Adresse für einen Benutzer.
     * Priorität: 1. User.email, 2. Keycloak, 3. Generiert aus Name
     */
    private String getEmailForUser(User user) {
        // 1. Falls User eine E-Mail hat, diese verwenden (und normalisieren)
        if (user.getEmail() != null && !user.getEmail().isEmpty()) {
            return normalizeEmail(user.getEmail());
        }

        // 2. Falls pupilId vorhanden, versuche über Keycloak
        if (user.getPupilId() != null && !user.getPupilId().isEmpty()) {
            String keycloakEmail = keycloakUserService.getUserEmail(user.getPupilId());
            if (keycloakEmail != null) {
                return normalizeEmail(keycloakEmail);
            }
        }

        // 3. E-Mail aus Namen generieren
        String normalizedName = user.getName()
                .toLowerCase()
                .replace(" ", ".")
                .replace("ä", "ae")
                .replace("ö", "oe")
                .replace("ü", "ue")
                .replace("ß", "ss");

        return normalizedName + "@" + emailDomain;
    }

    /**
     * Normalisiert eine E-Mail-Adresse für Gmail SMTP.
     * Ersetzt Sonderzeichen durch ASCII-Äquivalente.
     * 
     * @param email Die zu normalisierende E-Mail-Adresse
     * @return Normalisierte E-Mail-Adresse
     */
    private String normalizeEmail(String email) {
        if (email == null || email.isEmpty()) {
            return email;
        }
        
        return email
            // Deutsche Umlaute
            .replace("ä", "ae")
            .replace("ö", "oe")
            .replace("ü", "ue")
            .replace("Ä", "Ae")
            .replace("Ö", "Oe")
            .replace("Ü", "Ue")
            .replace("ß", "ss")
            // Slawische Sonderzeichen
            .replace("ć", "c")
            .replace("č", "c")
            .replace("ž", "z")
            .replace("š", "s")
            .replace("đ", "d")
            .replace("Ć", "C")
            .replace("Č", "C")
            .replace("Ž", "Z")
            .replace("Š", "S")
            .replace("Đ", "D")
            // Weitere diakritische Zeichen
            .replace("á", "a")
            .replace("à", "a")
            .replace("â", "a")
            .replace("é", "e")
            .replace("è", "e")
            .replace("ê", "e")
            .replace("í", "i")
            .replace("ì", "i")
            .replace("î", "i")
            .replace("ó", "o")
            .replace("ò", "o")
            .replace("ô", "o")
            .replace("ú", "u")
            .replace("ù", "u")
            .replace("û", "u")
            .replace("ñ", "n")
            .replace("ł", "l")
            .replace("Á", "A")
            .replace("À", "A")
            .replace("Â", "A")
            .replace("É", "E")
            .replace("È", "E")
            .replace("Ê", "E")
            .replace("Í", "I")
            .replace("Ì", "I")
            .replace("Î", "I")
            .replace("Ó", "O")
            .replace("Ò", "O")
            .replace("Ô", "O")
            .replace("Ú", "U")
            .replace("Ù", "U")
            .replace("Û", "U")
            .replace("Ñ", "N")
            .replace("Ł", "L");
    }

    // ==================== EXISTING SERVICE REQUEST NOTIFICATIONS ====================

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
     * Sendet Benachrichtigung an Provider, dass er eine NEUE ANFRAGE erhalten hat.
     * 
     * @param pupilId Die Keycloak User-ID des Providers (Empfänger)
     * @param senderName Name des Schülers der die Anfrage gesendet hat
     * @param serviceTypeName Name des Fachs
     * @return Uni<Void>
     */
    public Uni<Void> sendRequestReceivedEmail(String pupilId, String senderName, String serviceTypeName) {
        String recipientEmail = keycloakUserService.getUserEmail(pupilId);
        
        if (recipientEmail == null) {
            LOG.error("Cannot send email: No email address for pupilId: " + pupilId);
            return Uni.createFrom().voidItem();
        }
        
        LOG.info("Sending request received email for pupilId: " + pupilId + " to: " + recipientEmail);

        String subject = "🔔 Neue Nachhilfe-Anfrage erhalten!";
        String body = buildRequestReceivedEmailBody(senderName, serviceTypeName);
        
        return mailer.send(Mail.withHtml(recipientEmail, subject, body).setFrom(fromEmail))
            .onItem().invoke(() -> LOG.info("Request received email sent to: " + recipientEmail))
            .onFailure().invoke(t -> LOG.error("Failed to send request received email", t))
            .replaceWithVoid();
    }

    /**
     * Sendet Benachrichtigung an Sender, dass seine Anfrage ABGELEHNT wurde.
     * 
     * @param pupilId Die Keycloak User-ID des Senders
     * @param providerName Name des Providers der abgelehnt hat
     * @param serviceTypeName Name des Fachs
     * @return Uni<Void>
     */
    public Uni<Void> sendRequestRejectedEmail(String pupilId, String providerName, String serviceTypeName) {
        String recipientEmail = keycloakUserService.getUserEmail(pupilId);
        
        if (recipientEmail == null) {
            LOG.error("Cannot send email: No email address for pupilId: " + pupilId);
            return Uni.createFrom().voidItem();
        }
        
        LOG.info("Sending request rejected email for pupilId: " + pupilId + " to: " + recipientEmail);

        String subject = "❌ Nachhilfe-Anfrage wurde abgelehnt";
        String body = buildRequestRejectedEmailBody(providerName, serviceTypeName);
        
        return mailer.send(Mail.withHtml(recipientEmail, subject, body).setFrom(fromEmail))
            .onItem().invoke(() -> LOG.info("Request rejected email sent to: " + recipientEmail))
            .onFailure().invoke(t -> LOG.error("Failed to send request rejected email", t))
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
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .header {
                        background: linear-gradient(135deg, #4facfe 0%%, #00f2fe 100%%);
                        color: white;
                        padding: 20px;
                        text-align: center;
                        border-radius: 8px 8px 0 0;
                    }
                    .content {
                        background: #f9f9f9;
                        padding: 30px;
                        border-radius: 0 0 8px 8px;
                    }
                    .info-box {
                        background: white;
                        padding: 15px;
                        border-left: 4px solid #4facfe;
                        margin: 20px 0;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 20px;
                        font-size: 12px;
                        color: #666;
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
     * Erstellt Email-Body wenn Provider eine NEUE ANFRAGE erhalten hat.
     */
    private String buildRequestReceivedEmailBody(String senderName, String serviceTypeName) {
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
                        background: linear-gradient(135deg, ##ffd89b 0%%, ##19547b 100%%);
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
                        border-left: 4px solid ##ffd89b;
                        margin: 20px 0;
                    }
                    .button {
                        display: inline-block;
                        padding: 12px 24px;
                        background: ##19547b;
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
                    <h1>🔔 Neue Anfrage!</h1>
                </div>
                <div class="content">
                    <h2>Hallo!</h2>
                    <p>
                        Du hast eine <strong>neue Nachhilfe-Anfrage</strong> erhalten!
                    </p>
                    
                    <div class="info-box">
                        <p><strong>📚 Fach:</strong> %s</p>
                        <p><strong>👤 Schüler:</strong> %s</p>
                    </div>
                    
                    <p>
                        Bitte melde dich auf der Plattform an, um die Anfrage anzunehmen oder abzulehnen.
                    </p>
                    
                    <p>
                        <a href="http://vm10.htl-leonding.ac.at" class="button">Anfrage anzeigen</a>
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
            """.formatted(serviceTypeName, senderName);
    }

    /**
     * Erstellt Email-Body wenn Anfrage ABGELEHNT wurde.
     */
    private String buildRequestRejectedEmailBody(String providerName, String serviceTypeName) {
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
                        background: linear-gradient(135deg, ##ff6b6b 0%%, ##ee5a6f 100%%);
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
                        border-left: 4px solid ##ff6b6b;
                        margin: 20px 0;
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
                    <h1>❌ Anfrage abgelehnt</h1>
                </div>
                <div class="content">
                    <h2>Hallo!</h2>
                    <p>
                        Leider wurde deine Nachhilfe-Anfrage <strong>abgelehnt</strong>.
                    </p>
                    
                    <div class="info-box">
                        <p><strong>📚 Fach:</strong> %s</p>
                        <p><strong>👨‍🏫 Lehrer:</strong> %s</p>
                    </div>
                    
                    <p>
                        Aber keine Sorge! Es gibt viele andere Nachhilfelehrer auf der Plattform.
                    </p>
                    
                    <p>
                        <a href="http://vm10.htl-leonding.ac.at" class="button">Andere Lehrer finden</a>
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

    // ==================== HELPER METHODS ====================

    /**
     * Sendet eine E-Mail asynchron.
     * 
     * @param recipientEmail Empfänger-E-Mail
     * @param subject Betreff
     * @param htmlContent HTML-Inhalt
     */
    private void sendEmail(String recipientEmail, String subject, String htmlContent) {
        try {
            mailer.send(Mail.withHtml(recipientEmail, subject, htmlContent).setFrom(fromEmail))
                .onItem().invoke(() -> LOG.info("Email sent to: " + recipientEmail))
                .onFailure().invoke(t -> LOG.error("Failed to send email to " + recipientEmail, t))
                .subscribe().with(v -> {}, t -> LOG.error("Email send error", t));
        } catch (Exception e) {
            LOG.error("Failed to send email to " + recipientEmail + ": " + e.getMessage(), e);
        }
    }

    /**
     * Baut eine standardisierte HTML-E-Mail.
     * 
     * @param headerTitle Titel im Header
     * @param gradientStart Gradient-Startfarbe (z.B. "#10b981")
     * @param gradientEnd Gradient-Endfarbe (z.B. "#059669")
     * @param recipientName Name des Empfängers
     * @param introText Einleitungstext
     * @param contentSection Haupt-Content-Section (HTML)
     * @param buttonUrl URL für den Button
     * @param buttonText Text auf dem Button
     * @return HTML-String
     */
    private String buildBaseEmail(String headerTitle, String gradientStart, String gradientEnd,
                                  String recipientName, String introText, String contentSection,
                                  String buttonUrl, String buttonText) {
        return """
            <!DOCTYPE html>
            <html lang="de">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
                <table width="100%%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
                    <tr>
                        <td align="center">
                            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                                
                                <!-- Header -->
                                <tr>
                                    <td style="background: linear-gradient(135deg, %s 0%%, %s 100%%); padding: 30px; text-align: center;">
                                        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">%s</h1>
                                    </td>
                                </tr>
                                
                                <!-- Content -->
                                <tr>
                                    <td style="padding: 30px;">
                                        <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px 0;">
                                            Hallo <strong>%s</strong>,
                                        </p>
                                        <p style="font-size: 16px; color: #4b5563; margin: 0 0 20px 0;">
                                            %s
                                        </p>
                                        
                                        %s
                                        
                                        <p style="margin: 25px 0; text-align: center;">
                                            <a href="%s" style="display: inline-block; background: linear-gradient(135deg, %s 0%%, %s 100%%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; box-shadow: 0 4px 6px rgba(0,0,0,0.2);">
                                                %s
                                            </a>
                                        </p>
                                    </td>
                                </tr>
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                                        <p style="margin: 0; color: #6b7280; font-size: 14px;">%s</p>
                                        <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 12px;">Diese E-Mail wurde automatisch generiert.</p>
                                    </td>
                                </tr>
                                
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """.formatted(
                gradientStart, gradientEnd, headerTitle,
                recipientName, introText, contentSection,
                buttonUrl, gradientStart, gradientEnd, buttonText,
                appName
            );
    }
}
