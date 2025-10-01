package at.htl.endpoints;

import at.htl.entity.Review;
import at.htl.entity.ServiceType;
import at.htl.repository.ReviewRepository;
import at.htl.repository.ServiceTypeRepository;
import jakarta.inject.Inject;
import jakarta.json.Json;
import jakarta.json.JsonArrayBuilder;
import jakarta.json.JsonObject;
import jakarta.json.JsonObjectBuilder;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.RequestBody;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

import java.util.List;
import java.util.Map;

@Path("review")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ReviewResource {
    @Inject
    ReviewRepository reviewRepository;

    @Inject
    ServiceTypeRepository serviceTypeRepository;

    @GET
    @Transactional
    public Response getReviews() {
        List<Review> reviews = reviewRepository.listAll();

        if (reviews.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Keine Bewertungen gefunden!").build();
        }
        return Response.ok(reviews).build();
    }
    /*
    @GET
    @Path("/{serviceType}")
    @Transactional
    public Response getReviewsByServiceType(
            @PathParam("serviceType") String serviceType
    ) {
        List<Review> reviews = reviewRepository.list("serviceType.name", serviceType);

        if (reviews.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Keine Bewertungen zum Servicetypen gefunden!").build();
        }
        return Response.ok(reviews).build();
    }

    @GET
    @Path("/average-rating/{serviceType}")
    @Transactional
    public Response getServiceRating(@PathParam("serviceType") String serviceType) {
        Double averageRating = reviewRepository.getAverageRatingForServiceType(serviceType);
        return Response.ok(averageRating).build();
    }

    @GET
    @Path("/average-rating/{username}/{serviceType}")
    @Transactional
    public Response getUserServiceRating(
            @PathParam("username") String username,
            @PathParam("serviceType") String serviceType
    ) {
        Double averageRating = reviewRepository.getAverageRatingForUserAndServiceType(username, serviceType);
        return Response.ok(averageRating).build();
    }

    @POST
    @Transactional
    @Operation(summary = "Erstellt eine neue Bewertung",
            description = "Speichert eine neue Bewertung in der Datenbank")
    @APIResponse(responseCode = "200",
            description = "Bewertung erfolgreich erstellt",
            content = @Content(mediaType = MediaType.APPLICATION_JSON,
                    schema = @Schema(implementation = Review.class)))
    @APIResponse(responseCode = "400",
            description = "Ungültige Bewertungsdaten")
    public Response createReview(
            @   RequestBody(description = "Die zu erstellende Bewertung",
                    required = true,
                    content = @Content(schema = @Schema(implementation = Review.class)))
            Review review) {
        try {
            // Debug-Logging
            System.out.println("=== START Review Creation ===");
            System.out.println("Received review object: " + review);

            // Validierung
            if (review == null) {
                System.out.println("Error: Review object is null");
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity("{\"error\": \"Review cannot be null\"}")
                        .build();
            }

            // Prüfe, ob der ServiceType existiert
            ServiceType serviceType = serviceTypeRepository.findById(review.getServiceType().getId());
            if (serviceType == null) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Json.createObjectBuilder()
                        .add("error", "Service Type nicht gefunden!")
                        .build())
                    .build();
            }

            // Setze den gefundenen ServiceType
            review.setServiceType(serviceType);

            // Speichern
            reviewRepository.persist(review);
            reviewRepository.flush();  // Force DB sync

            // Explizit JSON zurückgeben
            JsonObjectBuilder builder = Json.createObjectBuilder();
            builder.add("id", review.getId());
            builder.add("rating", review.getRating());
            builder.add("comment", review.getComment());
            builder.add("status", "success");

            System.out.println("Success - Returning response: " + builder.build());
            System.out.println("=== END Review Creation ===");

            return Response.ok(builder.build())
                    .type(MediaType.APPLICATION_JSON)
                    .build();

        } catch (Exception e) {
            System.out.println("Error creating review: " + e.getMessage());
            e.printStackTrace();

            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\": \"" + e.getMessage() + "\"}")
                    .type(MediaType.APPLICATION_JSON)
                    .build();
        }
    }*/
}
