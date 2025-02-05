package com.example;

import jakarta.json.Json;
import jakarta.json.JsonArrayBuilder;
import jakarta.json.JsonObject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;


import java.util.List;


@Path("/d4d/reviews")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ReviewResource {

    @POST
    public Response createReview(JsonObject reviewJson) {
        try {
            System.out.println("Empfangene Review-Daten: " + reviewJson.toString());
            
            Review review = new Review(
                reviewJson.getString("evaluateeUsername"),
                reviewJson.getString("evaluatorUsername"),
                reviewJson.getString("serviceType"),
                reviewJson.getJsonNumber("rating").doubleValue(),
                reviewJson.getString("comment")
            );
            
            System.out.println("Review-Objekt erstellt: " + 
                "evaluatee=" + review.getEvaluateeUsername() + ", " +
                "evaluator=" + review.getEvaluatorUsername() + ", " +
                "serviceType=" + review.getServiceType() + ", " +
                "rating=" + review.getRating() + ", " +
                "comment=" + review.getComment());
            
            ReviewRepository.addReview(review);
            return Response.ok(Json.createObjectBuilder()
                .add("message", "Review created successfully")
                .build()).build();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(Json.createObjectBuilder()
                    .add("error", "Failed to create review")
                    .add("message", e.getMessage())
                    .add("details", e.toString())
                    .build())
                .build();
        }
    }

    @GET
    public Response getAllReviews() {
        List<Review> reviews = ReviewRepository.getAllReviews();
        JsonArrayBuilder jsonArrayBuilder = Json.createArrayBuilder();

        for (Review review : reviews) {
            JsonObject reviewJson = Json.createObjectBuilder()
                .add("evaluateeUsername", review.getEvaluateeUsername())
                .add("evaluatorUsername", review.getEvaluatorUsername())
                .add("serviceType", review.getServiceType())
                .add("rating", review.getRating())
                .add("comment", review.getComment())
                .add("createdAt", review.getCreatedAt().toString())
                .build();
            jsonArrayBuilder.add(reviewJson);
        }

        return Response.ok(jsonArrayBuilder.build()).build();
    }

    @GET
    @Path("/user/{username}")
    public Response getReviewsByUser(@PathParam("username") String username) {
        List<Review> reviews = ReviewRepository.getReviewsByUsername(username);
        JsonArrayBuilder jsonArrayBuilder = Json.createArrayBuilder();

        for (Review review : reviews) {
            JsonObject reviewJson = Json.createObjectBuilder()
                .add("evaluateeUsername", review.getEvaluateeUsername())
                .add("evaluatorUsername", review.getEvaluatorUsername())
                .add("serviceType", review.getServiceType())
                .add("rating", review.getRating())
                .add("comment", review.getComment())
                .add("createdAt", review.getCreatedAt().toString())
                .build();
            jsonArrayBuilder.add(reviewJson);
        }

        return Response.ok(jsonArrayBuilder.build()).build();
    }

     @GET
    @Path("/rating/{username}")
    public Response getUserRating(@PathParam("username") String username) {
        Double averageRating = ReviewRepository.getAverageRating(username);
        return Response.ok(Json.createObjectBuilder().add("rating", averageRating).build()).build();
    }

}
