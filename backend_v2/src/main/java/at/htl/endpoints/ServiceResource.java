package at.htl.endpoints;

import at.htl.entity.Market;
import at.htl.entity.Service;
import at.htl.entity.User;
import at.htl.repository.ServiceRepository;
import at.htl.repository.UserRepository;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

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

        List<Market> perfectMatchMarkets = serviceRepository.getPerfectMatchesByUser(user);

        if (perfectMatchMarkets == null || perfectMatchMarkets.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        List<Service> allServices = serviceRepository.listAll();
        List<java.util.Map<String, Object>> enrichedMatches = new java.util.ArrayList<>();
        
        for (Market market : perfectMatchMarkets) {
            Service matchingService = null;
            for (Service service : allServices) {
                if (service.getMarketProvider() != null && 
                    service.getMarketProvider().getId().equals(market.getId())) {
                    matchingService = service;
                    break;
                }
            }
            
            // Erstelle enriched object mit allen benötigten Daten
            Map<String, Object> enrichedMatch = new HashMap<>();
            enrichedMatch.put("id", market.getId());
            enrichedMatch.put("serviceType", market.getServiceType());
            enrichedMatch.put("user", market.getUser());
            enrichedMatch.put("offer", market.getOffer());
            enrichedMatch.put("serviceTypeName", market.getServiceType().getName());
            enrichedMatch.put("username", market.getUser().getName());
            enrichedMatch.put("typeId", market.getServiceType().getId());
            enrichedMatch.put("providerId", market.getUser().getId());
            
            // Füge Service-ID hinzu, falls Service gefunden wurde
            if (matchingService != null) {
                enrichedMatch.put("serviceId", matchingService.getId());
            }
            
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
