package at.htl.endpoints;

import at.htl.entity.Market;
import at.htl.entity.Service;
import at.htl.entity.User;
import at.htl.repository.MarketRepository;
import at.htl.repository.ServiceRepository;
import at.htl.repository.UserRepository;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Path("service")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ServiceResource {
    @Inject
    ServiceRepository serviceRepository;
    @Inject
    UserRepository userRepository;
    @Inject
    MarketRepository marketRepository;

    @GET
    @Path("/{username}")
    @Transactional
    public Response getServicesByUser(
            @PathParam("username") String username
    ) {
        User user = userRepository.find("name", username).firstResult();

        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        List<Service> services = serviceRepository.getServicesByUser(user);

        if (services == null || services.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(services).build();
    }

    @GET
    @Path("/perfect-matches/{username}")
    @Transactional
    public Response getPerfectMatches(
            @PathParam("username") String username
    ) {
        User user = userRepository.find("name", username).firstResult();

        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        // Hole User's Markets und separiere Offers/Demands
        List<Market> userMarkets = marketRepository.list("user", user);
        
        List<Long> userOfferIds = new ArrayList<>();
        List<Long> userDemandIds = new ArrayList<>();
        
        for (Market market : userMarkets) {
            if (market.getOffer() == 1) {
                userOfferIds.add(market.getServiceType().getId());
            } else {
                userDemandIds.add(market.getServiceType().getId());
            }
        }
        
        // Nutze die gemeinsame Matching-Methode
        List<Map<String, Object>> matches = serviceRepository.findMatchesWithPerfectMatchFlag(
            userOfferIds, 
            userDemandIds
        );
        
        // Filtere nur Perfect Matches
        List<Map<String, Object>> perfectMatches = matches.stream()
            .filter(m -> Boolean.TRUE.equals(m.get("isPerfectMatch")))
            .collect(java.util.stream.Collectors.toList());

        if (perfectMatches.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        
        // Enriche mit zusätzlichen Daten für Kompatibilität
        List<Map<String, Object>> enrichedMatches = new ArrayList<>();
        for (Map<String, Object> match : perfectMatches) {
            Map<String, Object> enrichedMatch = new HashMap<>(match);
            
            // Extrahiere Daten aus nested Maps
            Map<String, Object> serviceType = (Map<String, Object>) match.get("serviceType");
            Map<String, Object> userMap = (Map<String, Object>) match.get("user");
            
            enrichedMatch.put("serviceTypeName", serviceType.get("name"));
            enrichedMatch.put("username", userMap.get("name"));
            enrichedMatch.put("typeId", serviceType.get("id"));
            enrichedMatch.put("providerId", userMap.get("id"));
            
            enrichedMatches.add(enrichedMatch);
        }
        
        return Response.ok(enrichedMatches).build();
    }

    @GET
    @Path("/relevant/{username}")
    @Transactional
    public Response getRelevantServicesForUser(
            @PathParam("username") String username
    ) {
        User user = userRepository.find("name", username).firstResult();

        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        List<Service> services = serviceRepository.getRelevantServicesForUser(user);

        if (services == null || services.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(services).build();
    }
}
