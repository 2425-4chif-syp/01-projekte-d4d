package at.htl.endpoints.dto;

import at.htl.entity.Service;

public record ServiceResponseDto(
    Long id,
    String providerName,
    String clientName,
    String serviceTypeName,
    String status,
    String createdAt,
    String completedAt
) {
    public static ServiceResponseDto fromEntity(Service service) {
        return new ServiceResponseDto(
            service.getId(),
            service.getMarketProvider() != null && service.getMarketProvider().getUser() != null 
                ? service.getMarketProvider().getUser().getName() 
                : null,
            service.getMarketClient() != null && service.getMarketClient().getUser() != null 
                ? service.getMarketClient().getUser().getName() 
                : null,
            service.getMarketProvider() != null && service.getMarketProvider().getServiceType() != null 
                ? service.getMarketProvider().getServiceType().getName() 
                : null,
            service.getStatus(),
            service.getCreatedAt() != null ? service.getCreatedAt().toString() : null,
            service.getCompletedAt() != null ? service.getCompletedAt().toString() : null
        );
    }
}
