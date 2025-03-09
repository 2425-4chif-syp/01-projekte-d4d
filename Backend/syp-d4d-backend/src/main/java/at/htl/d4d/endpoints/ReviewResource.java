package at.htl.d4d.endpoints;

import at.htl.d4d.control.ReviewRepository;
import at.htl.d4d.entity.Review;
import jakarta.inject.Inject;
import jakarta.json.Json;
import jakarta.json.JsonArrayBuilder;
import jakarta.json.JsonObject;
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
            System.out.println("Empfangene Review-Daten: " + reviewJson.toString());

            // Neues Review-Objekt anlegen
            Review review = new Review(
                    reviewJson.getString("evaluateeUsername"),
                    reviewJson.getString("evaluatorUsername"),
                    reviewJson.getString("serviceType"),
                    reviewJson.getJsonNumber("rating").doubleValue(),
                    reviewJson.getString("comment")
            );

            // Persistieren
            reviewRepository.addReview(review);

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
        List<Review> reviews = reviewRepository.getAllReviews();
        JsonArrayBuilder arr = Json.createArrayBuilder();

        for (Review review : reviews) {
            arr.add(Json.createObjectBuilder()
                    .add("id", review.id) // PanacheEntity-ID
                    .add("evaluateeUsername", review.evaluateeUsername)
                    .add("evaluatorUsername", review.evaluatorUsername)
                    .add("serviceType", review.serviceType)
                    .add("rating", review.rating != null ? review.rating : 0.0)
                    .add("comment", review.comment != null ? review.comment : "")
                    .add("createdAt", review.createdAt.toString())
            );
        }
        return Response.ok(arr.build()).build();
    }

    @GET
    @Path("/user/{username}")
    public Response getReviewsByUser(@PathParam("username") String username) {
        List<Review> reviews = reviewRepository.getReviewsByUsername(username);
        JsonArrayBuilder arr = Json.createArrayBuilder();

        for (Review review : reviews) {
            arr.add(Json.createObjectBuilder()
                    .add("id", review.id)
                    .add("evaluateeUsername", review.evaluateeUsername)
                    .add("evaluatorUsername", review.evaluatorUsername)
                    .add("serviceType", review.serviceType)
                    .add("rating", review.rating != null ? review.rating : 0.0)
                    .add("comment", review.comment != null ? review.comment : "")
                    .add("createdAt", review.createdAt.toString())
            );
        }
        return Response.ok(arr.build()).build();
    }

    @GET
    @Path("/rating/{username}")
    public Response getUserRating(@PathParam("username") String username) {
        Double averageRating = reviewRepository.getAverageRating(username);
        return Response.ok(Json.createObjectBuilder()
                .add("rating", averageRating)
                .build()).build();
    }
}
