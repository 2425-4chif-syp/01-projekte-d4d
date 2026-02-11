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
    @JoinColumn(name="r_s_id")
    private Service service;

    @Column(name="r_rating")
    private Double rating;

    @Column(name="r_comment")
    private String comment;

    public Review() {

    }

    public Review(Service service, Double rating, String comment) {
        this.service = service;
        this.rating = rating;
        this.comment = comment;
    }

    public Service getService() {
        return service;
    }

    public void setService(Service service) {
        this.service = service;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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
