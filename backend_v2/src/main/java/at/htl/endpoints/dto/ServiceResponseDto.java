package at.htl.endpoints.dto;

import at.htl.entity.Service;

public record ServiceResponseDto(
    Long id,
    Long providerId,
    Long clientId,
    String providerName,
    String clientName,
    String serviceTypeName,
    Long serviceTypeId,
    String status,
    Boolean providerConfirmed,
    Boolean clientConfirmed,
    Boolean canReview,
    Boolean hasReviewed,
    String createdAt,
    String completedAt
) {
    public static ServiceResponseDto fromEntity(Service service) {
        return new ServiceResponseDto(
            service.getId(),
            service.getMarketProvider() != null && service.getMarketProvider().getUser() != null 
                ? service.getMarketProvider().getUser().getId() 
                : null,
            service.getMarketClient() != null && service.getMarketClient().getUser() != null 
                ? service.getMarketClient().getUser().getId() 
                : null,
            service.getMarketProvider() != null && service.getMarketProvider().getUser() != null 
                ? service.getMarketProvider().getUser().getName() 
                : null,
            service.getMarketClient() != null && service.getMarketClient().getUser() != null 
                ? service.getMarketClient().getUser().getName() 
                : null,
            service.getMarketProvider() != null && service.getMarketProvider().getServiceType() != null 
                ? service.getMarketProvider().getServiceType().getName() 
                : null,
            service.getMarketProvider() != null && service.getMarketProvider().getServiceType() != null 
                ? service.getMarketProvider().getServiceType().getId() 
                : null,
            service.getStatus(),
            service.getProviderConfirmed(),
            service.getClientConfirmed(),
            "COMPLETED".equals(service.getStatus()),
            false, // Will be set separately if needed
            service.getCreatedAt() != null ? service.getCreatedAt().toString() : null,
            service.getCompletedAt() != null ? service.getCompletedAt().toString() : null
        );
    }
}
