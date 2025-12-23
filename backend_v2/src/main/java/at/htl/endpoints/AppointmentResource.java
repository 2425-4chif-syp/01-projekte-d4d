package at.htl.endpoints;

import at.htl.endpoints.dto.AppointmentCreateDto;
import at.htl.endpoints.dto.AppointmentDto;
import at.htl.entity.Appointment;
import at.htl.entity.ChatEntry;
import at.htl.entity.ServiceType;
import at.htl.entity.User;
import at.htl.repository.AppointmentRepository;
import at.htl.repository.ChatEntryRepository;
import at.htl.repository.ServiceTypeRepository;
import at.htl.repository.UserRepository;
import at.htl.service.NotificationService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@ApplicationScoped
@Path("appointments")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AppointmentResource {

    private static final Logger LOG = Logger.getLogger(AppointmentResource.class);
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm");

    @Inject
    AppointmentRepository appointmentRepository;

    @Inject
    UserRepository userRepository;

    @Inject
    ServiceTypeRepository serviceTypeRepository;

    @Inject
    ChatEntryRepository chatEntryRepository;

    @Inject
    NotificationService notificationService;

    /**
     * POST /appointments
     * Erstellt einen neuen Terminvorschlag
     */
    @POST
    @Transactional
    public Response createAppointment(AppointmentCreateDto dto) {
        // Validate proposer
        User proposer = userRepository.findByPupilIdOrName(dto.proposerUsername());
        if (proposer == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Proposer user not found")
                    .build();
        }

        // Validate recipient
        User recipient = userRepository.findByPupilIdOrName(dto.recipientUsername());
        if (recipient == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Recipient user not found")
                    .build();
        }

        // Prevent self-appointment
        if (proposer.getId().equals(recipient.getId())) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Cannot create appointment with yourself")
                    .build();
        }

        // Validate times
        if (dto.startTime() == null || dto.endTime() == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Start and end time are required")
                    .build();
        }

        if (dto.endTime().isBefore(dto.startTime())) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("End time must be after start time")
                    .build();
        }

        if (dto.startTime().isBefore(LocalDateTime.now())) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Cannot create appointment in the past")
                    .build();
        }

        // Check for conflicts (Double Booking Prevention)
        if (appointmentRepository.hasConflict(proposer, dto.startTime(), dto.endTime())) {
            return Response.status(Response.Status.CONFLICT)
                    .entity("Proposer has a conflicting appointment at this time")
                    .build();
        }

        if (appointmentRepository.hasConflict(recipient, dto.startTime(), dto.endTime())) {
            return Response.status(Response.Status.CONFLICT)
                    .entity("Recipient has a conflicting appointment at this time")
                    .build();
        }

        // Create appointment
        Appointment appointment = new Appointment(
            proposer,
            recipient,
            dto.title() != null ? dto.title() : "Nachhilfetermin",
            dto.startTime(),
            dto.endTime()
        );

        // Optional fields
        if (dto.serviceTypeId() != null) {
            ServiceType serviceType = serviceTypeRepository.findById(dto.serviceTypeId());
            appointment.setServiceType(serviceType);
        }
        
        if (dto.description() != null) {
            appointment.setDescription(dto.description());
        }
        
        if (dto.timezone() != null) {
            appointment.setTimezone(dto.timezone());
        }
        
        if (dto.location() != null) {
            appointment.setLocation(dto.location());
        }
        
        if (dto.notes() != null) {
            appointment.setNotes(dto.notes());
        }

        appointmentRepository.persist(appointment);

        // Create chat notification with appointment data
        String appointmentMessage = String.format(
            "<<<APPOINTMENT:%d>>> %s hat einen Termin vorgeschlagen: %s am %s bis %s",
            appointment.getId(),
            proposer.getName(),
            appointment.getTitle(),
            appointment.getStartTime().format(DATE_FORMATTER),
            appointment.getEndTime().format(DateTimeFormatter.ofPattern("HH:mm"))
        );

        ChatEntry chatNotification = new ChatEntry();
        chatNotification.setSender(proposer);
        chatNotification.setReceiver(recipient);
        chatNotification.setMessage(appointmentMessage);
        chatNotification.setTime(new Timestamp(System.currentTimeMillis()));
        chatEntryRepository.persist(chatNotification);

        LOG.info("Created appointment: " + appointment.getId() + " between " + 
                 proposer.getName() + " and " + recipient.getName());

        // Send email notification to recipient about the new request
        try {
            notificationService.sendAppointmentRequest(appointment);
        } catch (Exception e) {
            LOG.error("Failed to send appointment request email: " + e.getMessage(), e);
        }

        return Response.status(Response.Status.CREATED)
                .entity(AppointmentDto.fromEntity(appointment))
                .build();
    }

    /**
     * GET /appointments/{username}
     * Holt alle Termine eines Users
     */
    @GET
    @Path("/{username}")
    @Transactional
    public Response getAppointments(@PathParam("username") String username) {
        User user = userRepository.findByPupilIdOrName(username);
        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("User not found")
                    .build();
        }

        List<AppointmentDto> appointments = appointmentRepository.findByUser(user)
                .stream()
                .map(AppointmentDto::fromEntity)
                .collect(Collectors.toList());

        return Response.ok(appointments).build();
    }

    /**
     * GET /appointments/{username}/upcoming
     * Holt alle anstehenden bestätigten Termine
     */
    @GET
    @Path("/{username}/upcoming")
    @Transactional
    public Response getUpcomingAppointments(@PathParam("username") String username) {
        User user = userRepository.findByPupilIdOrName(username);
        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("User not found")
                    .build();
        }

        List<AppointmentDto> appointments = appointmentRepository.findUpcomingByUser(user)
                .stream()
                .map(AppointmentDto::fromEntity)
                .collect(Collectors.toList());

        return Response.ok(appointments).build();
    }

    /**
     * GET /appointments/{username}/pending
     * Holt alle ausstehenden Terminanfragen für einen User
     */
    @GET
    @Path("/{username}/pending")
    @Transactional
    public Response getPendingAppointments(@PathParam("username") String username) {
        User user = userRepository.findByPupilIdOrName(username);
        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("User not found")
                    .build();
        }

        List<AppointmentDto> appointments = appointmentRepository.findPendingForRecipient(user)
                .stream()
                .map(AppointmentDto::fromEntity)
                .collect(Collectors.toList());

        return Response.ok(appointments).build();
    }

    /**
     * PUT /appointments/{id}/confirm
     * Bestätigt einen Terminvorschlag
     */
    @PUT
    @Path("/{id}/confirm")
    @Transactional
    public Response confirmAppointment(@PathParam("id") Long id) {
        Appointment appointment = appointmentRepository.findById(id);
        
        if (appointment == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Appointment not found")
                    .build();
        }

        if (appointment.getStatus() != Appointment.Status.PENDING) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Appointment is not pending")
                    .build();
        }

        // Re-check for conflicts before confirming
        if (appointmentRepository.hasConflict(appointment.getProposer(), 
                appointment.getStartTime(), appointment.getEndTime())) {
            return Response.status(Response.Status.CONFLICT)
                    .entity("A conflicting appointment was created in the meantime")
                    .build();
        }

        appointment.setStatus(Appointment.Status.CONFIRMED);
        appointmentRepository.persist(appointment);

        // Send chat confirmation to both users
        String confirmMessage = String.format(
            "<<<SYSTEM>>> Termin bestätigt! %s am %s - %s. Der Termin wurde in beide Kalender eingetragen.",
            appointment.getTitle(),
            appointment.getStartTime().format(DATE_FORMATTER),
            appointment.getEndTime().format(DateTimeFormatter.ofPattern("HH:mm"))
        );

        ChatEntry notification = new ChatEntry();
        notification.setSender(appointment.getRecipient());
        notification.setReceiver(appointment.getProposer());
        notification.setMessage(confirmMessage);
        notification.setTime(new Timestamp(System.currentTimeMillis()));
        chatEntryRepository.persist(notification);

        LOG.info("Appointment confirmed: " + id);

        // Send confirmation emails to BOTH participants with ICS download link
        try {
            notificationService.sendAppointmentConfirmation(appointment);
        } catch (Exception e) {
            LOG.error("Failed to send confirmation emails: " + e.getMessage(), e);
        }

        return Response.ok(AppointmentDto.fromEntity(appointment)).build();
    }

    /**
     * PUT /appointments/{id}/reject
     * Lehnt einen Terminvorschlag ab
     */
    @PUT
    @Path("/{id}/reject")
    @Transactional
    public Response rejectAppointment(@PathParam("id") Long id) {
        Appointment appointment = appointmentRepository.findById(id);
        
        if (appointment == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Appointment not found")
                    .build();
        }

        if (appointment.getStatus() != Appointment.Status.PENDING) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Appointment is not pending")
                    .build();
        }

        appointment.setStatus(Appointment.Status.REJECTED);
        appointmentRepository.persist(appointment);

        // Send rejection notification
        String rejectMessage = String.format(
            "<<<SYSTEM>>> Terminvorschlag abgelehnt: %s am %s",
            appointment.getTitle(),
            appointment.getStartTime().format(DATE_FORMATTER)
        );

        ChatEntry notification = new ChatEntry();
        notification.setSender(appointment.getRecipient());
        notification.setReceiver(appointment.getProposer());
        notification.setMessage(rejectMessage);
        notification.setTime(new Timestamp(System.currentTimeMillis()));
        chatEntryRepository.persist(notification);

        LOG.info("Appointment rejected: " + id);

        // Send rejection notification email to proposer
        try {
            notificationService.sendAppointmentRejection(appointment);
        } catch (Exception e) {
            LOG.error("Failed to send rejection email: " + e.getMessage(), e);
        }

        return Response.ok(AppointmentDto.fromEntity(appointment)).build();
    }

    /**
     * PUT /appointments/{id}/cancel
     * Storniert einen bestätigten Termin
     */
    @PUT
    @Path("/{id}/cancel")
    @Transactional
    public Response cancelAppointment(@PathParam("id") Long id) {
        Appointment appointment = appointmentRepository.findById(id);
        
        if (appointment == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Appointment not found")
                    .build();
        }

        if (appointment.getStatus() == Appointment.Status.CANCELLED) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Appointment is already cancelled")
                    .build();
        }

        appointment.setStatus(Appointment.Status.CANCELLED);
        appointmentRepository.persist(appointment);

        // Notify both users
        String cancelMessage = String.format(
            "<<<SYSTEM>>> Termin wurde storniert: %s am %s",
            appointment.getTitle(),
            appointment.getStartTime().format(DATE_FORMATTER)
        );

        ChatEntry notification = new ChatEntry();
        notification.setSender(appointment.getProposer());
        notification.setReceiver(appointment.getRecipient());
        notification.setMessage(cancelMessage);
        notification.setTime(new Timestamp(System.currentTimeMillis()));
        chatEntryRepository.persist(notification);

        LOG.info("Appointment cancelled: " + id);

        return Response.ok(AppointmentDto.fromEntity(appointment)).build();
    }

    /**
     * GET /appointments/{username}/range
     * Holt Termine in einem Zeitbereich (für Kalenderansicht)
     */
    @GET
    @Path("/{username}/range")
    @Transactional
    public Response getAppointmentsInRange(
            @PathParam("username") String username,
            @QueryParam("start") String startStr,
            @QueryParam("end") String endStr) {
        
        User user = userRepository.findByPupilIdOrName(username);
        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("User not found")
                    .build();
        }

        LocalDateTime start = startStr != null ? 
            LocalDateTime.parse(startStr) : LocalDateTime.now().minusMonths(1);
        LocalDateTime end = endStr != null ? 
            LocalDateTime.parse(endStr) : LocalDateTime.now().plusMonths(2);

        List<AppointmentDto> appointments = appointmentRepository
                .findByUserAndDateRange(user, start, end)
                .stream()
                .map(AppointmentDto::fromEntity)
                .collect(Collectors.toList());

        return Response.ok(appointments).build();
    }

    /**
     * GET /appointments/detail/{id}
     * Holt Details eines spezifischen Termins
     */
    @GET
    @Path("/detail/{id}")
    @Transactional
    public Response getAppointmentDetail(@PathParam("id") Long id) {
        Appointment appointment = appointmentRepository.findById(id);
        
        if (appointment == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Appointment not found")
                    .build();
        }

        return Response.ok(AppointmentDto.fromEntity(appointment)).build();
    }
}
