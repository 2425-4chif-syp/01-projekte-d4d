package at.htl.endpoints;

import at.htl.endpoints.dto.MarketDto;
import at.htl.entity.Market;
import at.htl.entity.ServiceType;
import at.htl.entity.User;
import at.htl.repository.MarketRepository;
import at.htl.repository.ServiceRepository;
import at.htl.repository.ReviewRepository;
import at.htl.repository.ServiceTypeRepository;
import at.htl.repository.UserRepository;
import jakarta.inject.Inject;
import jakarta.json.JsonObject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.ArrayList;
import java.util.List;

@Path("market")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class MarketResource {
    @Inject
    MarketRepository marketRepository;
    @Inject
    ServiceTypeRepository serviceTypeRepository;
    @Inject
    ServiceRepository serviceRepository;
    @Inject
    ReviewRepository reviewRepository;
    @Inject
    UserRepository userRepository;

    @GET
    @Transactional
    public Response getAllMarkets() {
        List<Market> markets = marketRepository.listAll();

        if (markets.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND).
                    entity("Keine Märkte gefunden!").build();
        }
        return Response.ok(markets).build();
    }

    @GET
    @Path("/{username}")
    @Transactional
    public Response getMarketsByUsername(
            @PathParam("username") String username
    ) {
        User user = userRepository.findByPupilIdOrName(username);
        
        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Benutzer nicht gefunden").build();
        }
        
        List<Market> markets = marketRepository.list("user.id = ?1", user.getId());

        if (markets.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Keine Markets zur übergebenen user_id gefunden!").build();
        }
        return Response.ok(markets).build();
    }

    @POST
    @Transactional
    public Response createMarkets(MarketDto marketDto) {
        User user = userRepository.findByPupilIdOrName(marketDto.username());
        
        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Benutzer nicht gefunden")
                    .build();
        }

        List<Market> offers = marketRepository
                .find("user.id = ?1 and offer = 1", user.getId()).list();
        boolean found;

        for (Market market : offers) {
            found = false;

            for (String offer: marketDto.offers()) {
                ServiceType serviceType = serviceTypeRepository
                        .find("name = ?1", offer).firstResult();

                if (market.getServiceType().equals(serviceType)) {
                    found = true;
                }
            }

            if (!found) {
                if (market != null && market.getId() != null) {
                    reviewRepository.delete("service.marketProvider.id = ?1 OR service.marketClient.id = ?1", market.getId());
                    serviceRepository.delete("marketProvider.id = ?1 OR marketClient.id = ?1", market.getId());
                    marketRepository.deleteById(market.getId());
                }
            }
        }

        for (String serviceOffer : marketDto.offers()) {
            ServiceType serviceType = serviceTypeRepository
                    .find("name = ?1", serviceOffer).firstResult();
            found = false;

            for (Market market : offers) {
                if (market.getServiceType().equals(serviceType)) {
                    found = true;
                }
            }

            if (!found) {
                marketRepository.persist(new Market(1, serviceType, user));
            }
        }

        List<Market> demands = marketRepository
                .find("user.id = ?1 and offer = 0", user.getId()).list();

        for (Market market : demands) {
            found = false;

            for (String demand: marketDto.demands()) {
                ServiceType serviceType = serviceTypeRepository
                        .find("name = ?1", demand).firstResult();

                if (market.getServiceType().equals(serviceType)) {
                    found = true;
                }
            }

            if (!found) {
                if (market != null && market.getId() != null) {
                    reviewRepository.delete("service.marketProvider.id = ?1 OR service.marketClient.id = ?1", market.getId());
                    serviceRepository.delete("marketProvider.id = ?1 OR marketClient.id = ?1", market.getId());
                    marketRepository.deleteById(market.getId());
                }
            }
        }

        for (String serviceDemand : marketDto.demands()) {
            ServiceType serviceType = serviceTypeRepository
                    .find("name = ?1", serviceDemand).firstResult();
            found = false;

            for (Market market : demands) {
                if (market.getServiceType().equals(serviceType)) {
                    found = true;
                }
            }

            if (!found) {
                marketRepository.persist(new Market(0, serviceType, user));
            }
        }
        return Response.status(Response.Status.CREATED).build();
    }

    @GET
    @Path("/completed-count/{username1}/{username2}")
    @Transactional
    public Response getCompletedServicesCount(
            @PathParam("username1") String username1,
            @PathParam("username2") String username2
    ) {
        User user1 = userRepository.findByPupilIdOrName(username1);
        User user2 = userRepository.findByPupilIdOrName(username2);
        
        if (user1 == null || user2 == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Benutzer nicht gefunden").build();
        }
        
        // Count completed services between these two users (in both directions)
        long count = serviceRepository.count(
            "(marketProvider.user.id = ?1 AND marketClient.user.id = ?2 AND status = 'COMPLETED') OR " +
            "(marketProvider.user.id = ?2 AND marketClient.user.id = ?1 AND status = 'COMPLETED')",
            user1.getId(), user2.getId()
        );
        
        return Response.ok()
                .entity("{\"completedCount\": " + count + "}")
                .build();
    }

    @GET
    @Path("/completed-services-count/{username1}/{username2}/{serviceTypeId}")
    @Transactional
    public Response getCompletedServicesCountByType(
            @PathParam("username1") String username1,
            @PathParam("username2") String username2,
            @PathParam("serviceTypeId") Long serviceTypeId
    ) {
        User user1 = userRepository.findByPupilIdOrName(username1);
        User user2 = userRepository.findByPupilIdOrName(username2);
        
        if (user1 == null || user2 == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Benutzer nicht gefunden").build();
        }
        
        // Count completed services between these two users for a specific service type
        long count = serviceRepository.count(
            "((marketProvider.user.id = ?1 AND marketClient.user.id = ?2) OR " +
            "(marketProvider.user.id = ?2 AND marketClient.user.id = ?1)) AND " +
            "status = 'COMPLETED' AND " +
            "(marketProvider.serviceType.id = ?3 OR marketClient.serviceType.id = ?3)",
            user1.getId(), user2.getId(), serviceTypeId
        );
        
        return Response.ok()
                .entity("{\"completedCount\": " + count + "}")
                .build();
    }
}
