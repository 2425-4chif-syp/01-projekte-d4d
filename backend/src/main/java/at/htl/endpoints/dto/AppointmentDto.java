package at.htl.endpoints.dto;

import at.htl.entity.Appointment;
import java.time.LocalDateTime;

public record AppointmentDto(
    Long id,
    Long proposerId,
    String proposerName,
    Long recipientId,
    String recipientName,
    Long serviceTypeId,
    String serviceTypeName,
    String title,
    String description,
    LocalDateTime startTime,
    LocalDateTime endTime,
    String timezone,
    String status,
    String location,
    String notes,
    LocalDateTime createdAt
) {
    public static AppointmentDto fromEntity(Appointment appointment) {
        return new AppointmentDto(
            appointment.getId(),
            appointment.getProposer().getId(),
            appointment.getProposer().getName(),
            appointment.getRecipient().getId(),
            appointment.getRecipient().getName(),
            appointment.getServiceType() != null ? appointment.getServiceType().getId() : null,
            appointment.getServiceType() != null ? appointment.getServiceType().getName() : null,
            appointment.getTitle(),
            appointment.getDescription(),
            appointment.getStartTime(),
            appointment.getEndTime(),
            appointment.getTimezone(),
            appointment.getStatus().name(),
            appointment.getLocation(),
            appointment.getNotes(),
            appointment.getCreatedAt()
        );
    }
}
