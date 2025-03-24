package at.htl.d4d.endpoints;

import at.htl.d4d.control.MarketRepository;
import at.htl.d4d.control.ServiceTypesRepository;
import at.htl.d4d.control.UserRepository;
import at.htl.d4d.entity.Market;
import at.htl.d4d.entity.ServiceType;
import at.htl.d4d.entity.User;
import jakarta.inject.Inject;
import jakarta.json.JsonArray;
import jakarta.json.JsonObject;
import jakarta.json.JsonString;
import jakarta.persistence.Column;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.hibernate.query.spi.SelectQueryPlan;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Path("d4d")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class MarketResource {

    @Inject
    UserRepository userRepository;

    @Inject
    MarketRepository marketRepository;

    @Inject
    ServiceTypesRepository serviceTypesRepository;

    public MarketResource() {
    }

    @POST
    @Path("/createMarket")
    @Produces(MediaType.TEXT_PLAIN)
    @Transactional
    public Response createService(JsonObject userJson) {

        String userName = userJson.getString("name");

        if (!userRepository.existsByName(userName)) {
            User newUser = new User(userName);
            userRepository.persist(newUser);
        }

        String serviceOffer = userJson.getString("serviceOffer");
        String serviceWanted = userJson.getString("serviceWanted");

        User user = userRepository.findUserByName(userName);

        ServiceType offerServiceType = serviceTypesRepository.findServiceTypeByName(serviceOffer);
        ServiceType wantedServiceType = serviceTypesRepository.findServiceTypeByName(serviceWanted);

        System.out.println(offerServiceType.id);
        System.out.println(wantedServiceType.id);

        Market offerMarket = new Market(offerServiceType.id, user.id, 1);
        Market wantedMarket = new Market(wantedServiceType.id, user.id, 0);


        marketRepository.persist(offerMarket);
        marketRepository.persist(wantedMarket);

        return Response.ok("Successfully").build();
    }

    @POST
    @Path("/createMultipleMarkets")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    public Response createMarketOffer(JsonObject jsonMarket) {
        String username = jsonMarket.getString("username");
        User user = userRepository.findUserByName(username);

        JsonArray jsonOffers = jsonMarket.getJsonArray("offers");
        List<String> serviceOffers = jsonOffers.getValuesAs(JsonString.class)
                .stream()
                .map(JsonString::getString)
                .toList();

        // deutsch, mathe, englisch

        List<Market> offers = marketRepository.findMarketOffersByUser(user.id);
        boolean found = false;
        // deutsch, mathe, englisch, syp

        for (Market market : offers) {
            found = false;

            for (String offer: serviceOffers) {
                ServiceType serviceType = serviceTypesRepository.findServiceTypeByName(offer);

                if (market.serviceType_ID.equals(serviceType.id)) {
                    found = true;
                }
            }

            if (!found) {
                marketRepository.deleteById(market.id);
            }
        }

        for (String serviceOffer : serviceOffers) {
            ServiceType serviceType = serviceTypesRepository.findServiceTypeByName(serviceOffer);
            found = false;

            for (Market market : offers) {
                if (market.serviceType_ID.equals(serviceType.id)) {
                    found = true;
                }
            }

            if (!found) {
                marketRepository.persist(new Market(serviceType.id, user.id, 1));
            }
        }

        JsonArray jsonDemands = jsonMarket.getJsonArray("demands");
        List<String> serviceDemands = jsonDemands.getValuesAs(JsonString.class)
                .stream()
                .map(JsonString::getString)
                .toList();

        List<Market> demands = marketRepository.findMarketDemandsByUser(user.id);

        for (Market market : demands) {
            found = false;

            for (String demand: serviceDemands) {
                ServiceType serviceType = serviceTypesRepository.findServiceTypeByName(demand);

                if (market.serviceType_ID.equals(serviceType.id)) {
                    found = true;
                }
            }

            if (!found) {
                marketRepository.deleteById(market.id);
            }
        }

        for (String serviceDemand : serviceDemands) {
            ServiceType serviceType = serviceTypesRepository.findServiceTypeByName(serviceDemand);
            found = false;

            for (Market market : demands) {
                if (market.serviceType_ID.equals(serviceType.id)) {
                    found = true;
                }
            }

            if (!found) {
                marketRepository.persist(new Market(serviceType.id, user.id, 0));
            }
        }
        return Response.ok("Successfully").build();
    }

    @GET
    @Path("/getMarkets/{username}")
    public Response getMarketsByUser(@PathParam("username") String username) {
        User user = userRepository.findUserByName(username);

        List<Market> marketsByUser = new ArrayList<>();
        List<Market> allMarkets = marketRepository.getAllMarkets();

        for (Market market : allMarkets) {
            if (Objects.equals(market.user_ID, user.id)) {
                marketsByUser.add(market);
            }
        }
        return Response.ok(marketsByUser).build();
    }

    @GET
    @Path("/allmarkets")
    public Response getAllMarkets() {
        List<Market> markets = marketRepository.listAll(); // z. B. Panache: Market.listAll()

        if (markets.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        // baue nun DTOS (also Name statt ID):
        List<MarketDto> dtos = new ArrayList<>();
        for (Market m : markets) {
            // Hole den User-Namen
            User u = userRepository.findById(m.user_ID);
            // Hole den ServiceType-Namen
            ServiceType st = serviceTypesRepository.findById(m.serviceType_ID);

            // Falls in DB vorhanden, baue DTO:
            String userName = (u != null) ? u.name : "Unbekannt";
            String serviceName = (st != null) ? st.getTypeOfService() : "Unbekannter Service";
            boolean isOffer = (m.offer == 1);

            dtos.add(new MarketDto(userName, serviceName, isOffer, m.startDate, m.endDate));
        }

        return Response.ok(dtos).build();
    }

    public class MarketDto {
        public String userName;
        public String serviceTypeName;
        public boolean isOffer; // offer == 1 => true
        public LocalDateTime startDate;
        public LocalDateTime endDate;

        // Beliebige weitere Felder
        public MarketDto(String userName, String serviceTypeName, boolean isOffer, LocalDateTime startDate, LocalDateTime endDate) {
            this.userName = userName;
            this.serviceTypeName = serviceTypeName;
            this.isOffer = isOffer;
            this.startDate = startDate;
            this.endDate = endDate;
        }
    }

}