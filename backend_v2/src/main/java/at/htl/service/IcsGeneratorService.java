package at.htl.service;

import at.htl.entity.Appointment;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Service für die Generierung von ICS (iCalendar) Dateien nach RFC 5545.
 * Ermöglicht den Export von Terminen in alle gängigen Kalenderanwendungen
 * (iOS, Android, Outlook, Google Calendar, etc.).
 */
@ApplicationScoped
public class IcsGeneratorService {

    private static final DateTimeFormatter ICS_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss");
    private static final String CRLF = "\r\n";

    @ConfigProperty(name = "app.base-url")
    String baseUrl;

    @ConfigProperty(name = "app.name")
    String appName;

    /**
     * Generiert eine RFC 5545 konforme ICS-Datei für einen Termin.
     * 
     * @param appointment Der Termin
     * @return ICS-Dateiinhalt als String
     */
    public String generateIcs(Appointment appointment) {
        StringBuilder ics = new StringBuilder();

        // Generiere eindeutige ID für den Termin
        String uid = generateUid(appointment);
        
        // Zeitzone verarbeiten
        ZoneId zoneId = ZoneId.of(appointment.getTimezone() != null ? 
                appointment.getTimezone() : "Europe/Vienna");

        // Formatiere Zeiten
        String dtStart = formatDateTime(appointment.getStartTime(), zoneId);
        String dtEnd = formatDateTime(appointment.getEndTime(), zoneId);
        String dtStamp = formatDateTime(LocalDateTime.now(), zoneId);

        // Baue VCALENDAR
        ics.append("BEGIN:VCALENDAR").append(CRLF);
        ics.append("VERSION:2.0").append(CRLF);
        ics.append("PRODID:-//").append(appName).append("//DE").append(CRLF);
        ics.append("CALSCALE:GREGORIAN").append(CRLF);
        ics.append("METHOD:PUBLISH").append(CRLF);

        // VTIMEZONE für Europe/Vienna
        ics.append(generateTimezoneComponent(zoneId));

        // VEVENT
        ics.append("BEGIN:VEVENT").append(CRLF);
        ics.append("UID:").append(uid).append(CRLF);
        ics.append("DTSTAMP:").append(dtStamp).append(CRLF);
        ics.append("DTSTART;TZID=").append(zoneId.getId()).append(":").append(dtStart).append(CRLF);
        ics.append("DTEND;TZID=").append(zoneId.getId()).append(":").append(dtEnd).append(CRLF);
        
        // Summary (Titel)
        String summary = buildSummary(appointment);
        ics.append("SUMMARY:").append(escapeIcsText(summary)).append(CRLF);

        // Description
        String description = buildDescription(appointment);
        ics.append("DESCRIPTION:").append(escapeIcsText(description)).append(CRLF);

        // Location (falls vorhanden)
        if (appointment.getLocation() != null && !appointment.getLocation().isEmpty()) {
            ics.append("LOCATION:").append(escapeIcsText(appointment.getLocation())).append(CRLF);
        }

        // Organizer (Proposer)
        if (appointment.getProposer() != null) {
            String organizerEmail = getEmailForUser(appointment.getProposer().getName());
            ics.append("ORGANIZER;CN=").append(escapeIcsText(appointment.getProposer().getName()))
               .append(":mailto:").append(organizerEmail).append(CRLF);
        }

        // Attendee (Recipient)
        if (appointment.getRecipient() != null) {
            String attendeeEmail = getEmailForUser(appointment.getRecipient().getName());
            ics.append("ATTENDEE;CN=").append(escapeIcsText(appointment.getRecipient().getName()))
               .append(";PARTSTAT=ACCEPTED:mailto:").append(attendeeEmail).append(CRLF);
        }

        // Status
        ics.append("STATUS:CONFIRMED").append(CRLF);

        // Erinnerung 30 Minuten vorher
        ics.append("BEGIN:VALARM").append(CRLF);
        ics.append("TRIGGER:-PT30M").append(CRLF);
        ics.append("ACTION:DISPLAY").append(CRLF);
        ics.append("DESCRIPTION:Erinnerung: ").append(escapeIcsText(summary)).append(CRLF);
        ics.append("END:VALARM").append(CRLF);

        // Zweite Erinnerung 1 Stunde vorher
        ics.append("BEGIN:VALARM").append(CRLF);
        ics.append("TRIGGER:-PT1H").append(CRLF);
        ics.append("ACTION:DISPLAY").append(CRLF);
        ics.append("DESCRIPTION:Erinnerung: ").append(escapeIcsText(summary)).append(" in 1 Stunde").append(CRLF);
        ics.append("END:VALARM").append(CRLF);

        ics.append("END:VEVENT").append(CRLF);
        ics.append("END:VCALENDAR").append(CRLF);

        return ics.toString();
    }

    /**
     * Generiert eine eindeutige UID für den Termin
     */
    private String generateUid(Appointment appointment) {
        return "appointment-" + appointment.getId() + "-" + 
               UUID.nameUUIDFromBytes(
                   (appointment.getId() + "-" + appointment.getCreatedAt()).getBytes()
               ).toString() + "@d4d.htl-leonding.ac.at";
    }

    /**
     * Formatiert LocalDateTime für ICS
     */
    private String formatDateTime(LocalDateTime dateTime, ZoneId zoneId) {
        return dateTime.format(ICS_DATE_FORMAT);
    }

    /**
     * Baut den Summary (Titel) für den Kalender
     */
    private String buildSummary(Appointment appointment) {
        StringBuilder summary = new StringBuilder();
        summary.append("Nachhilfe: ");
        
        if (appointment.getServiceType() != null) {
            summary.append(appointment.getServiceType().getName());
        } else if (appointment.getTitle() != null) {
            summary.append(appointment.getTitle());
        } else {
            summary.append("Nachhilfetermin");
        }
        
        return summary.toString();
    }

    /**
     * Baut die Beschreibung für den Kalender
     */
    private String buildDescription(Appointment appointment) {
        StringBuilder desc = new StringBuilder();
        
        desc.append("Nachhilfetermin zwischen ");
        desc.append(appointment.getProposer().getName());
        desc.append(" und ");
        desc.append(appointment.getRecipient().getName());
        desc.append(".\n\n");

        if (appointment.getServiceType() != null) {
            desc.append("Fach: ").append(appointment.getServiceType().getName()).append("\n");
        }

        if (appointment.getDescription() != null && !appointment.getDescription().isEmpty()) {
            desc.append("\nBeschreibung: ").append(appointment.getDescription()).append("\n");
        }

        if (appointment.getNotes() != null && !appointment.getNotes().isEmpty()) {
            desc.append("\nNotizen: ").append(appointment.getNotes()).append("\n");
        }

        desc.append("\n---\n");
        desc.append("Link zur Nachhilfebörse: ").append(baseUrl);

        return desc.toString();
    }

    /**
     * Generiert den VTIMEZONE-Komponenten für die Zeitzone
     */
    private String generateTimezoneComponent(ZoneId zoneId) {
        StringBuilder tz = new StringBuilder();
        
        // Vereinfachte Zeitzonenkomponente für Europe/Vienna
        tz.append("BEGIN:VTIMEZONE").append(CRLF);
        tz.append("TZID:").append(zoneId.getId()).append(CRLF);
        
        // Standardzeit (Winter)
        tz.append("BEGIN:STANDARD").append(CRLF);
        tz.append("DTSTART:19701025T030000").append(CRLF);
        tz.append("RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10").append(CRLF);
        tz.append("TZOFFSETFROM:+0200").append(CRLF);
        tz.append("TZOFFSETTO:+0100").append(CRLF);
        tz.append("TZNAME:CET").append(CRLF);
        tz.append("END:STANDARD").append(CRLF);
        
        // Sommerzeit
        tz.append("BEGIN:DAYLIGHT").append(CRLF);
        tz.append("DTSTART:19700329T020000").append(CRLF);
        tz.append("RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3").append(CRLF);
        tz.append("TZOFFSETFROM:+0100").append(CRLF);
        tz.append("TZOFFSETTO:+0200").append(CRLF);
        tz.append("TZNAME:CEST").append(CRLF);
        tz.append("END:DAYLIGHT").append(CRLF);
        
        tz.append("END:VTIMEZONE").append(CRLF);
        
        return tz.toString();
    }

    /**
     * Escaped Text für ICS-Format (RFC 5545)
     */
    private String escapeIcsText(String text) {
        if (text == null) return "";
        return text
            .replace("\\", "\\\\")
            .replace(",", "\\,")
            .replace(";", "\\;")
            .replace("\n", "\\n")
            .replace("\r", "");
    }

    /**
     * Generiert E-Mail-Adresse aus Username
     */
    private String getEmailForUser(String username) {
        if (username == null) return "unknown@d4d.htl-leonding.ac.at";
        // Für HTL Leonding Schüler: username@students.htl-leonding.ac.at
        return username.toLowerCase().replace(" ", ".") + "@students.htl-leonding.ac.at";
    }

    /**
     * Generiert den Dateinamen für den Download
     */
    public String generateFilename(Appointment appointment) {
        String title = appointment.getTitle() != null ? 
            appointment.getTitle().replaceAll("[^a-zA-Z0-9]", "_") : "termin";
        String date = appointment.getStartTime().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        return String.format("nachhilfe_%s_%s.ics", title, date);
    }
}
