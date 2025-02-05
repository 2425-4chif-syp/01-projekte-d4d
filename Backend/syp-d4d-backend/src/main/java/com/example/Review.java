package com.example;

import java.time.LocalDateTime;

public class Review {
    private Long id;
    private String evaluateeUsername;
    private String evaluatorUsername;
    private String serviceType;
    private Double rating;
    private String comment;
    private LocalDateTime createdAt;

      public Review(String evaluateeUsername, String evaluatorUsername, String serviceType, Double rating, String comment) {
        this.evaluateeUsername = evaluateeUsername;
        this.evaluatorUsername = evaluatorUsername;
        this.serviceType = serviceType;
        this.rating = rating;
        this.comment = comment;
        this.createdAt = LocalDateTime.now();
    }

   public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEvaluateeUsername() {
        return evaluateeUsername;
    }

    public void setEvaluateeUsername(String evaluateeUsername) {
        this.evaluateeUsername = evaluateeUsername;
    }

    public String getEvaluatorUsername() {
        return evaluatorUsername;
    }

    public void setEvaluatorUsername(String evaluatorUsername) {
        this.evaluatorUsername = evaluatorUsername;
    }

    public String getServiceType() {
        return serviceType;
    }

    public void setServiceType(String serviceType) {
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

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

}
