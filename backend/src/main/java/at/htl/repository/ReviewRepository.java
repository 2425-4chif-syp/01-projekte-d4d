package at.htl.repository;

import at.htl.entity.Review;
import at.htl.entity.Service;
import at.htl.entity.User;
import at.htl.endpoints.dto.UserRatingStatsDto;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class ReviewRepository implements PanacheRepository<Review> {
    
    public boolean existsByServiceAndReviewer(Service service, User reviewer) {
        long count = count("service = ?1", service);
        return count > 0;
    }
    
    public List<Review> findByProviderUser(User providerUser) {
        return list("service.marketProvider.user = ?1", providerUser);
    }
    
    public UserRatingStatsDto getUserRatingStats(User providerUser) {
        List<Review> reviews = findByProviderUser(providerUser);
        
        if (reviews.isEmpty()) {
            return new UserRatingStatsDto(
                providerUser.getId(), 
                providerUser.getName(), 
                0.0, 
                0L
            );
        }
        
        double average = reviews.stream()
                .mapToDouble(r -> r.getRating() != null ? r.getRating() : 0.0)
                .average()
                .orElse(0.0);
                
        return new UserRatingStatsDto(
            providerUser.getId(),
            providerUser.getName(),
            Math.round(average * 10.0) / 10.0,
            (long) reviews.size()
        );
    }
    
    public boolean hasUserReviewedService(Service service, User reviewer) {
        return count("service = ?1", service) > 0;
    }
    
    public List<Review> findByTypeAndProvider(Long typeId, Long providerId) {
        return list(
            "SELECT r FROM Review r " +
            "WHERE r.service.marketProvider.serviceType.id = ?1 " +
            "AND r.service.marketProvider.user.id = ?2 " +
            "AND r.service.marketProvider.offer = 1",
            typeId, 
            providerId
        );
    }
}
