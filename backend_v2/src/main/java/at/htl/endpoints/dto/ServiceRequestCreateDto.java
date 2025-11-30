package at.htl.endpoints.dto;

/**
 * DTO for creating a new service request
 */
public record ServiceRequestCreateDto(
    String senderUsername,
    Long marketId
) {
}
