package at.htl.repository;

import at.htl.entity.Review;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class ReviewRepository implements PanacheRepository<Review> {
    public Double getAverageRatingForServiceType(String serviceType) {
        List<Review> reviews = list("serviceType.name", serviceType);

        return reviews.stream()
                .mapToDouble(r -> r.getRating() != null ? r.getRating() : 0.0)
                .average()
                .orElse(0.0);
    }

    public Double getAverageRatingForUserAndServiceType(String username, String serviceType) {
        List<Review> reviews = list("evaluatee.name = ?1 and serviceType.name = ?2", username, serviceType);

        return reviews.stream()
                .mapToDouble(r -> r.getRating() != null ? r.getRating() : 0.0)
                .average()
                .orElse(0.0);
    }
}
