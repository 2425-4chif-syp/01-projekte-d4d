package at.htl.d4d.control;

import at.htl.d4d.entity.Market;
import at.htl.d4d.entity.Service;
import at.htl.d4d.entity.User;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.ArrayList;
import java.util.List;

@ApplicationScoped
public class ServiceRepository implements PanacheRepository<Service> {

    @Inject
    MarketRepository marketRepository;


    public List<Market> getServicesByUser(User user) {
        List<Service> allServices = getAllServices();
        List<Market> servicesByUser = new ArrayList<>();

        for (Service service : allServices) {
            Long marketProviderId = service.getMarketProvider_ID();
            Long marketClientId = service.getMarketClient_ID();
            Market market = new Market();
            if (marketRepository.findById(marketProviderId).user_ID.equals(user.id)){
                //return market from client
                market = marketRepository.findById(marketClientId);
                servicesByUser.add(market);
            }
            else if(marketRepository.findById(marketClientId).user_ID.equals(user.id)){
                //return market from provider
                market = marketRepository.findById(marketProviderId);
                servicesByUser.add(market);
            }
        }
        return servicesByUser;
    }

    public List<Service> getAllServices() {
        return listAll();
    }
}
