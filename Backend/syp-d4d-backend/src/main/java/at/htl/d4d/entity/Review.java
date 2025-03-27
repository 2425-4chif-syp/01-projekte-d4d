package at.htl.d4d.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import java.time.LocalDateTime;

@Entity
public class Review extends PanacheEntity {

    @Column(name = "evaluatee_username")
    public String evaluateeUsername;

    @Column(name = "evaluator_username")
    public String evaluatorUsername;

    @Column(name = "service_type")
    public String serviceType;

    @Column(name = "rating")
    public Double rating;

    @Column(name = "comment")
    public String comment;

    @Column(name = "created_at")
    public LocalDateTime createdAt = LocalDateTime.now();

    public Review() {}

    public Review(String evaluateeUsername, String evaluatorUsername,
                  String serviceType, Double rating, String comment) {
        this.evaluateeUsername = evaluateeUsername;
        this.evaluatorUsername = evaluatorUsername;
        this.serviceType = serviceType;
        this.rating = rating;
        this.comment = comment;
    }

    // Neue Getter
    public String getEvaluateeUsername() {
        return evaluateeUsername;
    }

    public String getEvaluatorUsername() {
        return evaluatorUsername;
    }

    public String getServiceType() {
        return serviceType;
    }

    public Double getRating() {
        return rating;
    }

    public String getComment() {
        return comment;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
