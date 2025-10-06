package at.htl.endpoints;

import at.htl.endpoints.dto.RatingRequestDto;
import at.htl.endpoints.dto.UserRatingStatsDto;
import at.htl.entity.Review;
import at.htl.entity.Service;
import at.htl.entity.User;
import at.htl.repository.ReviewRepository;
import at.htl.repository.ServiceRepository;
import at.htl.repository.UserRepository;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

@Path("ratings")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class RatingResource {

    @Inject
    ReviewRepository reviewRepository;
    
    @Inject
    ServiceRepository serviceRepository;
    
    @Inject
    UserRepository userRepository;

    @POST
    @Transactional
    @Operation(summary = "Erstellt eine neue Bewertung für einen Service/Anbieter")
    @APIResponse(responseCode = "201", description = "Bewertung erfolgreich erstellt")
    @APIResponse(responseCode = "400", description = "Validierungsfehler")
    @APIResponse(responseCode = "404", description = "Service nicht gefunden")
    @APIResponse(responseCode = "409", description = "Service bereits bewertet")
    public Response createRating(@Valid RatingRequestDto ratingRequest) {
        
        // 1. Service laden
        Service service = serviceRepository.findById(ratingRequest.getServiceId());
        if (service == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Service mit ID " + ratingRequest.getServiceId() + " nicht gefunden")
                    .build();
        }
        
        // 2. Anbieter-User ermitteln (über marketProvider)
        if (service.getMarketProvider() == null || service.getMarketProvider().getUser() == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Service hat keinen gültigen Anbieter")
                    .build();
        }
        
        User providerUser = service.getMarketProvider().getUser();
        
        // 3. Aktueller User (Reviewer) - für jetzt nehmen wir den aktiven User
        User reviewer = userRepository.getActiveUser();
        if (reviewer == null || reviewer.getName() == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Kein aktiver Benutzer für Bewertung")
                    .build();
        }
        
        // 4. Prüfen ob bereits bewertet (Duplicate-Check)
        if (reviewRepository.hasUserReviewedService(service, reviewer)) {
            return Response.status(Response.Status.CONFLICT)
                    .entity("Service wurde bereits bewertet")
                    .build();
        }
        
        // 5. Bewertung erstellen und speichern
        Review review = new Review();
        review.setService(service);
        review.setRating(ratingRequest.getStars().doubleValue());
        review.setComment(ratingRequest.getComment());
        
        reviewRepository.persist(review);
        
        // 6. Aktuelle Statistiken für den Anbieter zurückgeben
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
            // Return empty stats if user not found
            return Response.ok(new UserRatingStatsDto(null, username, 0.0, 0L)).build();
        }
        
        UserRatingStatsDto stats = reviewRepository.getUserRatingStats(user);
        return Response.ok(stats).build();
    }
}