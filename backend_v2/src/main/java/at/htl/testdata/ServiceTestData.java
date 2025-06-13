package at.htl.testdata;

import at.htl.entity.Market;
import at.htl.entity.Service;
import at.htl.repository.MarketRepository;
import at.htl.repository.ServiceRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@ApplicationScoped
public class ServiceTestData {
    @Inject
    ServiceRepository serviceRepository;

    @Inject
    MarketRepository marketRepository;

    @Inject
    EntityManager entityManager;

    public void generateServiceTestData() {
        entityManager.createNativeQuery("DELETE FROM d4d_service").executeUpdate();

        List<Market> markets = marketRepository.listAll();
        List<Service> allServices = new ArrayList<>();

        for (Market market : markets) {
            for (Market market2 : markets) {
                if (market.getServiceType().getId().equals(market2.getServiceType().getId()) &&
                        market.getOffer() != market2.getOffer() &&
                        !market.getUser().getId().equals(market2.getUser().getId())
                ) {
                    if (market.getOffer() == 1) {
                        allServices.add(new Service(market, market2));
                    } else {
                        allServices.add(new Service(market2, market));
                    }
                }
            }
        }

        Collections.shuffle(allServices);
        int halfSize = (int) Math.ceil(allServices.size() / 2.0);
        List<Service> randomServices = allServices.subList(0, Math.min(
                halfSize, allServices.size()));

        for (Service service : randomServices) {
            serviceRepository.persist(service);
        }
    }
}
