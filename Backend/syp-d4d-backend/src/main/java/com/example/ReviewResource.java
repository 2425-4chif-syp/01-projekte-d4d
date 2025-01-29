package com.example;

import jakarta.json.Json;
import jakarta.json.JsonArrayBuilder;
import jakarta.json.JsonObject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;

@Path("/reviews")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ReviewResource {

    @POST
    public Response receiveReview(JsonObject reviewJson) {
        String user = reviewJson.getString("user");
        String review = reviewJson.getString("review");

        // Save review in the database
        ReviewRepository.saveReview(user, review);

        return Response.ok(Json.createObjectBuilder()
                .add("user", user)
                .add("review", review)
                .build()).build();
    }

    @GET
    public Response getReviews() {
        List<Review> reviews = ReviewRepository.getAllReviews();
        JsonArrayBuilder jsonArrayBuilder = Json.createArrayBuilder();

        for (Review rev : reviews) {
            jsonArrayBuilder.add(Json.createObjectBuilder()
                    .add("user", rev.getUserName())
                    .add("review", rev.getReview())
                    .add("createdAt", rev.getCreatedAt().toString()));
        }

        return Response.ok(jsonArrayBuilder.build()).build();
    }
}
