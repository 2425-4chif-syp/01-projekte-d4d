package at.htl.endpoints.dto;

import at.htl.entity.ServiceRequest;

import java.time.Instant;

/**
 * DTO for returning service request information to the frontend
 */
public record ServiceRequestResponseDto(
    Long id,
    String senderName,
    Long senderId,
    String receiverName,
    Long receiverId,
    Long marketId,
    String serviceTypeName,
    String status,
    Instant createdAt
) {
    public static ServiceRequestResponseDto fromEntity(ServiceRequest request) {
        return new ServiceRequestResponseDto(
            request.getId(),
            request.getSender().getName(),
            request.getSender().getId(),
            request.getReceiver().getName(),
            request.getReceiver().getId(),
            request.getMarket().getId(),
            request.getMarket().getServiceType().getName(),
            request.getStatus(),
            request.getCreatedAt().toInstant()
        );
    }
}
