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
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

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




}
