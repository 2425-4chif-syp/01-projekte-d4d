package at.htl.d4d.control;

import at.htl.d4d.entity.Review;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class ReviewRepository implements PanacheRepository<Review> {

    /**
     * Speichert eine neue Review.
     */
    public void addReview(Review review) {
        persist(review);
    }

    /**
     * Liefert alle Reviews zurück.
     */
    public List<Review> getAllReviews() {
        return listAll();
    }

    /**
     * Liefert alle Reviews zurück, bei denen der Service-Typ (serviceType) übereinstimmt.
     */
    public List<Review> getReviewsByServiceType(String serviceType) {
        return list("serviceType", serviceType);
    }

    /**
     * Durchschnitts-Rating anhand des Service-Typs.
     */
    public Double getAverageRatingForServiceType(String serviceType) {
        List<Review> reviews = getReviewsByServiceType(serviceType);
        return reviews.stream()
                .mapToDouble(r -> r.rating != null ? r.rating : 0.0)
                .average()
                .orElse(0.0);
    }
}
