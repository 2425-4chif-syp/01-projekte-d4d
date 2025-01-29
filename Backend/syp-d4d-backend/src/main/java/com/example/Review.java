package com.example;

import java.time.LocalDateTime;

public class Review {
    private String userName;
    private String review;
    private LocalDateTime createdAt;

    public Review(String userName, String review, LocalDateTime createdAt) {
        this.userName = userName;
        this.review = review;
        this.createdAt = createdAt;
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
