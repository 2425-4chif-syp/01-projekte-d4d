package com.example;

import java.util.ArrayList;
import java.util.List;

public class ReviewRepository {
    private static List<Review> reviews = new ArrayList<>();

    public static void saveReview(String user, String review) {
        reviews.add(new Review(user, review, java.time.LocalDateTime.now()));
    }

    public static List<Review> getAllReviews() {
        return new ArrayList<>(reviews);
    }
}
