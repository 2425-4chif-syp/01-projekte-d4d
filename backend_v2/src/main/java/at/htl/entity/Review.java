package at.htl.entity;

import jakarta.persistence.*;

@Entity
@Table(name="d4d_review")
public class Review {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="r_id")
    private Long id;

    @ManyToOne
    @JoinColumn(name="r_u_evaluatee_id")
    private User evaluatee;

    @ManyToOne
    @JoinColumn(name="r_u_evaluator_id")
    private User evaluator;

    @ManyToOne
    @JoinColumn(name="r_st_id")
    private ServiceType serviceType;

    @Column(name="r_rating")
    private Double rating;

    @Column(name="r_comment")
    private String comment;

    public Review() {

    }

    public Review(User evaluatee, User evaluator, ServiceType serviceType, Double rating, String comment) {
        this.evaluatee = evaluatee;
        this.evaluator = evaluator;
        this.serviceType = serviceType;
        this.rating = rating;
        this.comment = comment;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getEvaluatee() {
        return evaluatee;
    }

    public void setEvaluatee(User evaluatee) {
        this.evaluatee = evaluatee;
    }

    public User getEvaluator() {
        return evaluator;
    }

    public void setEvaluator(User evaluator) {
        this.evaluator = evaluator;
    }

    public ServiceType getServiceType() {
        return serviceType;
    }

    public void setServiceType(ServiceType serviceType) {
        this.serviceType = serviceType;
    }

    public Double getRating() {
        return rating;
    }

    public void setRating(Double rating) {
        this.rating = rating;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }
}
