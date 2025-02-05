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

    public String getUserName() {
        return userName;
    }

    public String getReview() {
        return review;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
