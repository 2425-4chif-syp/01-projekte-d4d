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

            if (providerMarket.user_ID.equals(user.id)){
                Market market = marketRepository.findById(marketClientId);
                servicesByUser.add(market);
            }
            else if (clientMarket.user_ID.equals(user.id)){
                Market market = marketRepository.findById(marketProviderId);
                servicesByUser.add(market);
            }
        }
        return servicesByUser;
    }

    public List<Service> getAllServices() {
        return listAll();
    }

    public List<Market> getPerfectMatchesByUser(User user) {
        List<Market> allMarkets = marketRepository.getAllMarkets();
        List<Market> perfectMatches = new ArrayList<>();

        for (Market market : allMarkets) {
            if (market.user_ID.equals(user.id)) {
                continue;
            }

            Market userMarket = marketRepository.findMarketByUser(user.id);

            if (marketRepository.hasMarketWithOfferAndWant(market.user_ID)) {
                if (market.offer == 1 && userMarket.offer == 0 && market.serviceType_ID.equals(userMarket.serviceType_ID)) {
                    perfectMatches.add(market);
                } else if (market.offer == 0 && userMarket.offer == 1 && market.serviceType_ID.equals(userMarket.serviceType_ID)) {
                    perfectMatches.add(market);
                }
            }
        }

        return perfectMatches;
    }
}
