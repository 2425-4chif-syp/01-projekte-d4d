package at.htl.endpoints;

import at.htl.endpoints.dto.RatingRequestDto;
import at.htl.endpoints.dto.UserRatingStatsDto;
import at.htl.entity.Review;
import at.htl.entity.Service;
import at.htl.entity.User;
import at.htl.entity.Session;
import at.htl.repository.ReviewRepository;
import at.htl.repository.ServiceRepository;
import at.htl.repository.UserRepository;
import at.htl.repository.SessionRepository;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

@Path("reviews")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ReviewResource {

    @Inject
    ReviewRepository reviewRepository;
    
    @Inject
    ServiceRepository serviceRepository;
    
    @Inject
    UserRepository userRepository;
    
    @Inject
    SessionRepository sessionRepository;

    @POST
    @Transactional
    @Operation(summary = "Erstellt eine neue Bewertung für einen Service/Anbieter")
    @APIResponse(responseCode = "201", description = "Bewertung erfolgreich erstellt")
    @APIResponse(responseCode = "400", description = "Validierungsfehler")
    @APIResponse(responseCode = "404", description = "Service nicht gefunden")
    @APIResponse(responseCode = "409", description = "Service bereits bewertet")
    public Response createReview(@CookieParam("d4d_session_id") String sessionId,
                                 @Valid RatingRequestDto ratingRequest) {
        
        Service service = serviceRepository.findById(ratingRequest.getServiceId());
        if (service == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Service mit ID " + ratingRequest.getServiceId() + " nicht gefunden")
                    .build();
        }
        
        if (service.getMarketProvider() == null || service.getMarketProvider().getUser() == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Service hat keinen gültigen Anbieter")
                    .build();
        }
        
        User providerUser = service.getMarketProvider().getUser();
        
        // Hole User aus Session
        if (sessionId == null || sessionId.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Keine Session vorhanden. Bitte melde dich an.")
                    .build();
        }
        
        Session session = sessionRepository.findByIdOrNull(sessionId);
        if (session == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Session ungültig oder abgelaufen. Bitte melde dich erneut an.")
                    .build();
        }
        
        User reviewer = session.getUser();
        if (reviewer == null || reviewer.getName() == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Kein angemeldeter Benutzer. Bitte melde dich an.")
                    .build();
        }
        
        if (reviewRepository.hasUserReviewedService(service, reviewer)) {
            return Response.status(Response.Status.CONFLICT)
                    .entity("Service wurde bereits bewertet")
                    .build();
        }
        
        Review review = new Review();
        review.setService(service);
        review.setRating(ratingRequest.getStars());
        review.setComment(ratingRequest.getComment());
        
        reviewRepository.persist(review);
        
        UserRatingStatsDto stats = reviewRepository.getUserRatingStats(providerUser);
        
        return Response.status(Response.Status.CREATED)
                .entity(stats)
                .build();
    }
    
    @GET
    @Path("/user/{userId}")
    @Transactional
    @Operation(summary = "Holt Bewertungsstatistiken für einen User")
    public Response getUserRatingStats(@PathParam("userId") Long userId) {
        
        User user = userRepository.findById(userId);
        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("User nicht gefunden")
                    .build();
        }
        
        UserRatingStatsDto stats = reviewRepository.getUserRatingStats(user);
        return Response.ok(stats).build();
    }
    
    @GET
    @Path("/user/by-name/{username}")
    @Transactional
    @Operation(summary = "Holt Bewertungsstatistiken für einen User anhand des Benutzernamens")
    public Response getUserRatingStatsByName(@PathParam("username") String username) {
        
        User user = userRepository.find("name", username).firstResult();
        if (user == null) {
            return Response.ok(new UserRatingStatsDto(null, username, 0.0, 0L)).build();
        }
        
        UserRatingStatsDto stats = reviewRepository.getUserRatingStats(user);
        return Response.ok(stats).build();
    }
    
    @GET
    @Path("/can-review/{serviceId}")
    @Transactional
    @Operation(summary = "Prüft ob der aktuelle User einen Service bewerten kann")
    @APIResponse(responseCode = "200", description = "Rückgabe ob Bewertung möglich ist")
    public Response canReviewService(@CookieParam("d4d_session_id") String sessionId,
                                     @PathParam("serviceId") Long serviceId) {
        
        Service service = serviceRepository.findById(serviceId);
        if (service == null) {
            return Response.ok(new java.util.HashMap<String, Object>() {{
                put("canReview", false);
                put("reason", "Service nicht gefunden");
            }}).build();
        }
        
        // Hole User aus Session
        if (sessionId == null || sessionId.isEmpty()) {
            return Response.ok(new java.util.HashMap<String, Object>() {{
                put("canReview", false);
                put("reason", "Keine Session vorhanden");
            }}).build();
        }
        
        Session session = sessionRepository.findByIdOrNull(sessionId);
        if (session == null) {
            return Response.ok(new java.util.HashMap<String, Object>() {{
                put("canReview", false);
                put("reason", "Session ungültig");
            }}).build();
        }
        
        User reviewer = session.getUser();
        if (reviewer == null || reviewer.getName() == null) {
            return Response.ok(new java.util.HashMap<String, Object>() {{
                put("canReview", false);
                put("reason", "Kein angemeldeter Benutzer");
            }}).build();
        }
        
        boolean hasReviewed = reviewRepository.hasUserReviewedService(service, reviewer);
        
        if (hasReviewed) {
            return Response.ok(new java.util.HashMap<String, Object>() {{
                put("canReview", false);
                put("reason", "Bereits bewertet");
                put("reviewedBy", reviewer.getName());
            }}).build();
        }
        
        return Response.ok(new java.util.HashMap<String, Object>() {{
            put("canReview", true);
            put("reason", "Bewertung möglich");
        }}).build();
    }
    
    @GET
    @Path("/type/{typeId}/provider/{providerId}")
    @Transactional
    @Operation(summary = "Holt alle Bewertungen für eine bestimmte Dienstleistungsart und einen Anbieter")
    @APIResponse(responseCode = "200", description = "Liste der Bewertungen zurückgegeben")
    public Response getReviewsByTypeAndProvider(
            @PathParam("typeId") Long typeId, 
            @PathParam("providerId") Long providerId) {
        
        var reviews = reviewRepository.findByTypeAndProvider(typeId, providerId);
        
        final double average;
        if (!reviews.isEmpty()) {
            average = reviews.stream()
                    .mapToDouble(r -> r.getRating() != null ? r.getRating() : 0.0)
                    .average()
                    .orElse(0.0);
        } else {
            average = 0.0;
        }
        
        return Response.ok(new java.util.HashMap<String, Object>() {{
            put("reviews", reviews);
            put("averageRating", Math.round(average * 10.0) / 10.0);
            put("totalReviews", reviews.size());
        }}).build();
    }
}
