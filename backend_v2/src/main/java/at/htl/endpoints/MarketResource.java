package at.htl.endpoints;

import at.htl.endpoints.dto.MarketDto;
import at.htl.entity.Market;
import at.htl.entity.ServiceType;
import at.htl.entity.User;
import at.htl.repository.MarketRepository;
import at.htl.repository.ServiceRepository;
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
        List<Market> markets = marketRepository.list("user.name = ?1", username);

        if (markets.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Keine Markets zur übergebenen user_id gefunden!").build();
        }
        return Response.ok(markets).build();
    }

    @POST
    @Transactional
    public Response createMarkets(MarketDto marketDto) {
        User user = userRepository.find("name", marketDto.username()).firstResult();

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
}
