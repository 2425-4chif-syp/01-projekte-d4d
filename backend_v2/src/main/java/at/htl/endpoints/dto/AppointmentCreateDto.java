package at.htl.endpoints.dto;

import java.time.LocalDateTime;

public record AppointmentCreateDto(
    String proposerUsername,
    String recipientUsername,
    Long serviceTypeId,      // Optional
    String title,
    String description,      // Optional
    LocalDateTime startTime,
    LocalDateTime endTime,
    String timezone,         // Optional, default: Europe/Vienna
    String location,         // Optional
    String notes             // Optional
) {}
