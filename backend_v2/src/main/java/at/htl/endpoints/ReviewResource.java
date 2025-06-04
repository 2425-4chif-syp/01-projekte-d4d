package at.htl.endpoints;

import at.htl.entity.Review;
import at.htl.entity.ServiceType;
import at.htl.repository.ReviewRepository;
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

@Path("review")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ReviewResource {
    @Inject
    ReviewRepository reviewRepository;

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
    public Response createReview(Review review) {
        reviewRepository.persist(review);
        return Response.status(Response.Status.CREATED).entity(review).build();
    }
}
