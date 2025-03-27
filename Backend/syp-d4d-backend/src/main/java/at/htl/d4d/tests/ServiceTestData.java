package at.htl.d4d.tests;

import at.htl.d4d.control.MarketRepository;
import at.htl.d4d.control.ServiceRepository;
import at.htl.d4d.entity.Market;
import at.htl.d4d.entity.Service;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@ApplicationScoped
public class ServiceTestData {
    @Inject
    MarketRepository marketRepository;

    @Inject
    ServiceRepository serviceRepository;

    @Transactional
    public void generateServiceTestData() {
        List<Market> markets = marketRepository.getAllMarkets();
        List<Service> allServices = new ArrayList<>();

        for (Market market : markets) {
            for (Market market2 : markets) {
                if (market.serviceType_ID.equals(market2.serviceType_ID) &&
                        market.offer != market2.offer && !market.user_ID.equals(market2.user_ID)) {

                    if (market.offer == 1)
                    {
                        allServices.add(new Service(market.id, market2.id));
                    } else {
                        allServices.add(new Service(market2.id, market.id));
                    }
                }
            }
        }

        Collections.shuffle(allServices);
        int halfSize = (int) Math.ceil(allServices.size() / 2.0);
        List<Service> randomServices = allServices.subList(0, halfSize);

        for (Service service : randomServices) {
            serviceRepository.persist(service);
        }
    }
}