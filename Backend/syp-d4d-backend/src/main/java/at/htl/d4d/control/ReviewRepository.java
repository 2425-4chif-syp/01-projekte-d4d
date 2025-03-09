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
     * Liefert alle Reviews, bei denen evaluateeUsername = username
     * (oder passe an, wenn du evaluatorUsername etc. auch willst).
     */
    public List<Review> getReviewsByUsername(String username) {
        return list("evaluateeUsername", username);
    }

    /**
     * Durchschnitts-Rating anhand evaluateeUsername.
     */
    public Double getAverageRating(String username) {
        List<Review> reviews = getReviewsByUsername(username);
        return reviews.stream()
                .mapToDouble(r -> r.rating != null ? r.rating : 0.0)
                .average()
                .orElse(0.0);
    }
}
