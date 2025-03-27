package at.htl.d4d.tests;

import at.htl.d4d.control.MarketRepository;
import at.htl.d4d.control.ServiceTypesRepository;
import at.htl.d4d.control.UserRepository;
import at.htl.d4d.entity.Market;
import at.htl.d4d.entity.User;
import at.htl.d4d.entity.ServiceType;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.util.*;
import java.util.stream.Collectors;

@ApplicationScoped
public class MarketTestData {

    @Inject
    private MarketRepository marketRepository;

    @Inject
    private UserRepository userRepository;

    @Inject
    private ServiceTypesRepository serviceTypesRepository;

    private static final int MAX_MARKET_ENTRIES = 315; // 300 + 5% tolerance

    @Transactional
    public void generateMarketTestData() {
        System.out.println("[INFO] Starting generation of marketplace test data...");
        
        List<User> users = userRepository.getAllUsers();
        List<ServiceType> serviceTypes = serviceTypesRepository.getAllServiceTypes();
        
        System.out.println("[DEBUG] Found " + users.size() + " users");
        System.out.println("[DEBUG] Found " + serviceTypes.size() + " service types");
        
        Set<String> existingMarketKeys = new HashSet<>();
        Random random = new Random();
        
        List<Market> marketList = new ArrayList<>();
        
        for (User user : users) {
            // With probability 40%, create "seeking help" entries (offerType = 0)
            if (random.nextDouble() < 0.4) {
                int entryCount = 1 + random.nextInt(5);
                createMarketEntriesForUser(user, entryCount, 0, serviceTypes, existingMarketKeys, marketList, random);
            }
            // With probability 20%, create "offering tutoring" entries (offerType = 1)
            if (random.nextDouble() < 0.2) {
                int entryCount = 1 + random.nextInt(5);
                createMarketEntriesForUser(user, entryCount, 1, serviceTypes, existingMarketKeys, marketList, random);
            }
        }
        
        // Limit the total number of entries to MAX_MARKET_ENTRIES
        if (marketList.size() > MAX_MARKET_ENTRIES) {
            marketList = marketList.subList(0, MAX_MARKET_ENTRIES);
        }
        
        System.out.println("[DEBUG] About to persist " + marketList.size() + " market entries");
        
        // Persist all marketplace entries
        int count = 0;
        for (Market market : marketList) {
            marketRepository.persist(market);
            System.out.println("[DEBUG] Persisted market entry " + count + ": " + market);
            count++;
        }

        System.out.println("[INFO] Marketplace test data successfully generated. Number of entries: " + marketList.size());
    }
    
    private void createMarketEntriesForUser(User user, int entryCount, int offerType,
                                              List<ServiceType> serviceTypes, Set<String> existingMarketKeys,
                                              List<Market> marketList, Random random) {
        Set<ServiceType> selectedServiceTypes = new HashSet<>();
        while (selectedServiceTypes.size() < entryCount && selectedServiceTypes.size() < serviceTypes.size()) {
            ServiceType randomServiceType = serviceTypes.get(random.nextInt(serviceTypes.size()));
            if (selectedServiceTypes.add(randomServiceType)) {
                // Unique key to avoid duplicate entries for the same user, service type and offer type
                String key = user.id + "-" + randomServiceType.id + "-" + offerType;
                if (!existingMarketKeys.contains(key)) {
                    existingMarketKeys.add(key);
                    marketList.add(new Market(randomServiceType.id, user.id, offerType));
                }
            }
        }
    }
}
