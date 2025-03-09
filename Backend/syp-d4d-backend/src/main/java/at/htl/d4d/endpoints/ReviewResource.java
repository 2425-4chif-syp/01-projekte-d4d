package at.htl.d4d.endpoints;

import at.htl.d4d.control.ReviewRepository;
import at.htl.d4d.entity.Review;
import jakarta.inject.Inject;
import jakarta.json.Json;
import jakarta.json.JsonArrayBuilder;
import jakarta.json.JsonObject;
import jakarta.json.JsonObjectBuilder;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;

@Path("/d4d/reviews")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ReviewResource {

    @Inject
    ReviewRepository reviewRepository;

    @POST
    @Transactional
    public Response createReview(JsonObject reviewJson) {
        try {
            System.out.println("Empfangene Review-Daten: " + reviewJson);

            // Neues Review-Objekt anlegen (String-Felder + Double rating)
            Review review = new Review(
                    reviewJson.getString("evaluateeUsername", ""),
                    reviewJson.getString("evaluatorUsername", ""),
                    reviewJson.getString("serviceType", ""),
                    reviewJson.isNull("rating")
                            ? 0.0
                            : reviewJson.getJsonNumber("rating").doubleValue(),
                    reviewJson.getString("comment", "")
            );

            reviewRepository.addReview(review); // Panache-Methoden oder wie du es implementiert hast

            return Response.ok(
                    Json.createObjectBuilder()
                            .add("message", "Review created successfully")
                            .build()
            ).build();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Json.createObjectBuilder()
                            .add("error", "Failed to create review")
                            .add("message", e.getMessage())
                            .build())
                    .build();
        }
    }

    @GET
    public Response getAllReviews() {
        List<Review> reviews = reviewRepository.getAllReviews();
        JsonArrayBuilder arr = Json.createArrayBuilder();

        for (Review review : reviews) {
            // Falls rating null ist, ersetze durch 0.0
            double ratingVal = (review.getRating() != null) ? review.getRating() : 0.0;

            JsonObjectBuilder obj = Json.createObjectBuilder()
                    .add("evaluateeUsername", review.getEvaluateeUsername() != null ? review.getEvaluateeUsername() : "")
                    .add("evaluatorUsername", review.getEvaluatorUsername() != null ? review.getEvaluatorUsername() : "")
                    .add("serviceType", review.getServiceType() != null ? review.getServiceType() : "")
                    .add("rating", ratingVal) // <-- echte Zahl, kein Objekt
                    .add("comment", review.getComment() != null ? review.getComment() : "")
                    .add("createdAt", review.getCreatedAt() != null ? review.getCreatedAt().toString() : "");
            arr.add(obj);
        }

        return Response.ok(arr.build()).build();
    }

    @GET
    @Path("/user/{username}")
    public Response getReviewsByUser(@PathParam("username") String username) {
        List<Review> reviews = reviewRepository.getReviewsByUsername(username);
        JsonArrayBuilder arr = Json.createArrayBuilder();

        for (Review review : reviews) {
            double ratingVal = (review.getRating() != null) ? review.getRating() : 0.0;

            JsonObjectBuilder obj = Json.createObjectBuilder()
                    .add("evaluateeUsername", review.getEvaluateeUsername() != null ? review.getEvaluateeUsername() : "")
                    .add("evaluatorUsername", review.getEvaluatorUsername() != null ? review.getEvaluatorUsername() : "")
                    .add("serviceType", review.getServiceType() != null ? review.getServiceType() : "")
                    .add("rating", ratingVal)
                    .add("comment", review.getComment() != null ? review.getComment() : "")
                    .add("createdAt", review.getCreatedAt() != null ? review.getCreatedAt().toString() : "");
            arr.add(obj);
        }

        return Response.ok(arr.build()).build();
    }

    @GET
    @Path("/rating/{username}")
    public Response getUserRating(@PathParam("username") String username) {
        Double averageRating = reviewRepository.getAverageRating(username);
        if (averageRating == null) {
            averageRating = 0.0;
        }
        return Response.ok(
                Json.createObjectBuilder()
                        .add("rating", averageRating)
                        .build()
        ).build();
    }
}
