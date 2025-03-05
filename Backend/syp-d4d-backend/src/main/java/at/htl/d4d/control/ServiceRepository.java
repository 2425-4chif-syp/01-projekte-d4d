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
            
            Market providerMarket = marketRepository.findById(marketProviderId);
            Market clientMarket = marketRepository.findById(marketClientId);

            /*if (providerMarket.user_ID.equals(user.id)){
                Market market = marketRepository.findById(marketClientId);
                System.out.println("Market: " + market);
                servicesByUser.add(market);
            }*/
            if (clientMarket.user_ID.equals(user.id)){
                Market market = marketRepository.findById(marketProviderId);
                System.out.println("Market: " + market);
                servicesByUser.add(market);
            }
        }
        
        if (servicesByUser.isEmpty()) {
            System.out.println("Keine Services gefunden");
        } else {
            System.out.println("Gefundene Services: " + servicesByUser.size());
        }
        
        System.out.println("==========================================");
        return servicesByUser;
    }

    public List<Service> getAllServices() {
        return listAll();
    }
}
