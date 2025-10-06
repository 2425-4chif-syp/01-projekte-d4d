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
    
    /**
     * Prüft ob bereits eine Bewertung für den Service von einem bestimmten Reviewer existiert
     */
    public boolean existsByServiceAndReviewer(Service service, User reviewer) {
        // Da wir keinen direkten Reviewer haben, prüfen wir über eine custom Query
        // Hier nehmen wir an, dass der "reviewer" über den aktiven User bestimmt wird
        long count = count("service = ?1", service);
        return count > 0;
    }
    
    /**
     * Holt alle Bewertungen für Services eines bestimmten Anbieters (User)
     */
    public List<Review> findByProviderUser(User providerUser) {
        return list("service.marketProvider.user = ?1", providerUser);
    }
    
    /**
     * Berechnet Durchschnittsbewertung und Anzahl für einen Anbieter
     */
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
            Math.round(average * 10.0) / 10.0, // Auf 1 Dezimalstelle runden
            (long) reviews.size()
        );
    }
    
    /**
     * Prüft ob ein Service bereits vom aktuellen "Reviewer" bewertet wurde
     * Da wir kein Reviewer-Feld haben, implementieren wir das später über Session-Management
     */
    public boolean hasUserReviewedService(Service service, User reviewer) {
        // Für jetzt nehmen wir an, dass nur eine Bewertung pro Service erlaubt ist
        // Das kann später erweitert werden wenn Reviewer-Management implementiert wird
        return count("service = ?1", service) > 0;
    }
}
