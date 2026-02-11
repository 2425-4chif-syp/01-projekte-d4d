package at.htl.endpoints;

import at.htl.entity.Appointment;
import at.htl.repository.AppointmentRepository;
import at.htl.service.IcsGeneratorService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;

/**
 * REST Resource für Kalender-Export (ICS-Dateien).
 * Ermöglicht den Download von Terminen im iCalendar-Format.
 */
@ApplicationScoped
@Path("appointments")
public class AppointmentCalendarResource {

    private static final Logger LOG = Logger.getLogger(AppointmentCalendarResource.class);
    private static final String ICS_MEDIA_TYPE = "text/calendar";

    @Inject
    AppointmentRepository appointmentRepository;

    @Inject
    IcsGeneratorService icsGeneratorService;

    /**
     * GET /appointments/{id}/ics
     * 
     * Generiert und liefert eine ICS-Datei für den angegebenen Termin.
     * Die Datei kann direkt in Kalenderanwendungen importiert werden.
     * 
     * @param id Die ID des Termins
     * @return ICS-Datei als Download oder 404 wenn nicht gefunden
     */
    @GET
    @Path("/{id}/ics")
    @Produces(ICS_MEDIA_TYPE)
    @Transactional
    public Response downloadIcs(@PathParam("id") Long id) {
        LOG.info("ICS download requested for appointment: " + id);

        // Termin laden
        Appointment appointment = appointmentRepository.findById(id);

        if (appointment == null) {
            LOG.warn("Appointment not found for ICS download: " + id);
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Termin nicht gefunden")
                    .type(MediaType.TEXT_PLAIN)
                    .build();
        }

        // Prüfen ob Termin bestätigt ist
        if (appointment.getStatus() != Appointment.Status.CONFIRMED) {
            LOG.warn("Attempted ICS download for non-confirmed appointment: " + id);
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Nur bestätigte Termine können exportiert werden")
                    .type(MediaType.TEXT_PLAIN)
                    .build();
        }

        try {
            // ICS generieren
            String icsContent = icsGeneratorService.generateIcs(appointment);
            String filename = icsGeneratorService.generateFilename(appointment);

            LOG.info("Successfully generated ICS for appointment: " + id);

            return Response.ok(icsContent)
                    .header("Content-Disposition", "attachment; filename=\"" + filename + "\"")
                    .header("Content-Type", ICS_MEDIA_TYPE + "; charset=utf-8")
                    .build();

        } catch (Exception e) {
            LOG.error("Error generating ICS for appointment " + id + ": " + e.getMessage(), e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Fehler beim Generieren der Kalenderdatei")
                    .type(MediaType.TEXT_PLAIN)
                    .build();
        }
    }

    /**
     * GET /appointments/{id}/ics/preview
     * 
     * Zeigt eine Vorschau der ICS-Datei (für Debugging).
     * 
     * @param id Die ID des Termins
     * @return ICS-Inhalt als Text
     */
    @GET
    @Path("/{id}/ics/preview")
    @Produces(MediaType.TEXT_PLAIN)
    @Transactional
    public Response previewIcs(@PathParam("id") Long id) {
        Appointment appointment = appointmentRepository.findById(id);

        if (appointment == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Termin nicht gefunden")
                    .build();
        }

        try {
            String icsContent = icsGeneratorService.generateIcs(appointment);
            return Response.ok(icsContent).build();
        } catch (Exception e) {
            LOG.error("Error previewing ICS: " + e.getMessage(), e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Fehler: " + e.getMessage())
                    .build();
        }
    }
}
