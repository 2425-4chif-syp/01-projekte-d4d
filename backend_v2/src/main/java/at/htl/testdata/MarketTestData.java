package at.htl.testdata;

import at.htl.entity.Market;
import at.htl.entity.ServiceType;
import at.htl.entity.User;
import at.htl.repository.MarketRepository;
import at.htl.repository.ServiceTypeRepository;
import at.htl.repository.UserRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;

import java.util.*;

@ApplicationScoped
public class MarketTestData {
    @Inject
    MarketRepository marketRepository;

    @Inject
    UserRepository userRepository;
    @Inject
    ServiceTypeRepository serviceTypeRepository;

    @Inject
    EntityManager entityManager;

    public void generateMarketTestData() {
        entityManager.createNativeQuery("DELETE FROM d4d_market").executeUpdate();

        List<User> users = userRepository.listAll();
        List<ServiceType> serviceTypes = serviceTypeRepository.listAll();

        Set<String> existingMarketKeys = new HashSet<>();
        Random random = new Random();
        List<Market> marketList = new ArrayList<>();

        for (User user : users) {
            if (random.nextDouble() < 0.4) {
                int entryCount = 1 + random.nextInt(5);
                createMarketEntriesForUser(user, entryCount, 0, serviceTypes, existingMarketKeys, marketList, random);
            }

            if (random.nextDouble() < 0.2) {
                int entryCount = 1 + random.nextInt(5);
                createMarketEntriesForUser(user, entryCount, 1, serviceTypes, existingMarketKeys, marketList, random);
            }
        }

        if (marketList.size() > 315) {
            marketList = marketList.subList(0, 315);
        }

        int count = 0;
        for (Market market : marketList) {
            marketRepository.persist(market);
            count++;
        }
    }

    private void createMarketEntriesForUser(
            User user,
            int entryCount,
            int offerType,
            List<ServiceType> serviceTypes,
            Set<String> existingMarketKeys,
            List<Market> marketList, Random random
    ) {
        Set<ServiceType> selectedServiceTypes = new HashSet<>();
        while (selectedServiceTypes.size() < entryCount
                && selectedServiceTypes.size() < serviceTypes.size()
        ) {
            ServiceType randomServiceType = serviceTypes.get(random.nextInt(serviceTypes.size()));
            if (selectedServiceTypes.add(randomServiceType)) {
                String key = user.getId() + "-" + randomServiceType.getId() + "-" + offerType;
                if (!existingMarketKeys.contains(key)) {
                    existingMarketKeys.add(key);
                    marketList.add(new Market(offerType, randomServiceType, user));
                }
            }
        }
    }
}
