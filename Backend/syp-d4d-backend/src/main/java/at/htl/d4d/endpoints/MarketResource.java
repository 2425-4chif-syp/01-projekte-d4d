package at.htl.d4d.endpoints;

import at.htl.d4d.control.MarketRepository;
import at.htl.d4d.control.ServiceTypesRepository;
import at.htl.d4d.control.UserRepository;
import at.htl.d4d.entity.Market;
import at.htl.d4d.entity.ServiceType;
import at.htl.d4d.entity.User;
import jakarta.inject.Inject;
import jakarta.json.JsonObject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.hibernate.query.spi.SelectQueryPlan;

import java.util.ArrayList;
import java.util.List;

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

            dtos.add(new MarketDto(userName, serviceName, isOffer));
        }

        return Response.ok(dtos).build();
    }

    public class MarketDto {
        public String userName;
        public String serviceTypeName;
        public boolean isOffer; // offer == 1 => true

        // Beliebige weitere Felder
        public MarketDto(String userName, String serviceTypeName, boolean isOffer) {
            this.userName = userName;
            this.serviceTypeName = serviceTypeName;
            this.isOffer = isOffer;
        }
    }

}