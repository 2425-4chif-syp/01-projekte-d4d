package at.htl.repository;

import at.htl.entity.Market;
import at.htl.entity.Service;
import at.htl.entity.User;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@ApplicationScoped
public class ServiceRepository implements PanacheRepository<Service> {
    @Inject
    MarketRepository marketRepository;

    public List<Service> getServicesByUser(User user) {
        List<Service> allServices = listAll();
        List<Service> servicesByUser = new ArrayList<>();

        for (Service service : allServices) {
            if (service.getMarketClient().getUser().equals(user) ||
            service.getMarketProvider().getUser().equals(user)) {
                servicesByUser.add(service);
            }
        }
        return servicesByUser;
    }

    public List<Service> getRelevantServicesForUser(User user) {
        List<Service> allServices = listAll();
        List<Service> relevantServices = new ArrayList<>();
        List<Market> userMarkets = marketRepository.list("user", user);

        for (Service service : allServices) {
            // Add services where the user is involved (existing functionality)
            if (service.getMarketClient().getUser().equals(user) ||
                service.getMarketProvider().getUser().equals(user)) {
                relevantServices.add(service);
                continue;
            }

            // Add services where others are looking for what the user offers
            for (Market userMarket : userMarkets) {
                if (userMarket.getOffer() == 1) { // User offers this service
                    // Check if someone else is demanding this service type
                    if (service.getMarketClient().getServiceType().getId().equals(userMarket.getServiceType().getId()) &&
                        service.getMarketClient().getOffer() == 0 && // It's a demand
                        !service.getMarketClient().getUser().equals(user)) { // Not the user themselves
                        relevantServices.add(service);
                        break;
                    }
                }
            }
        }
        return relevantServices;
    }

    public List<Market> getPerfectMatchesByUser(User user) {
        List<Market> perfectMatches = new ArrayList<>();
        List<Market> allMarkets = marketRepository.listAll();

        List<Market> userMarkets = allMarkets.stream()
                .filter(market -> market.getUser().getId().equals(user.getId()))
                .toList();

        if (userMarkets.isEmpty()) {
            return perfectMatches;
        }

        Map<Long, Integer> matchCountsByUser = new HashMap<>();

        for (Market userMarket : userMarkets) {
            for (Market otherMarket : allMarkets) {
                if (otherMarket.getUser().getId().equals(user.getId())) {
                    continue;
                }

                if (otherMarket.getServiceType().getId().equals(userMarket.getServiceType().getId()) &&
                        userMarket.getOffer() != otherMarket.getOffer()) {

                    Long otherUserId = otherMarket.getUser().getId();
                    matchCountsByUser.put(otherUserId,
                            matchCountsByUser.getOrDefault(otherUserId, 0) + 1);
                }
            }
        }

        for (Long otherUserId : matchCountsByUser.keySet()) {
            if (matchCountsByUser.get(otherUserId) >= 2) {
                if (hasReciprocalMatch(user.getId(), otherUserId, allMarkets)) {

                    for (Market otherMarket : allMarkets) {
                        if (otherMarket.getUser().getId().equals(otherUserId)) {
                            for (Market userMarket : userMarkets) {
                                if (userMarket.getServiceType().getId().equals(otherMarket.getServiceType().getId())
                                        && userMarket.getOffer() != otherMarket.getOffer()) {
                                    perfectMatches.add(otherMarket);
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
        return perfectMatches;
    }

    private boolean hasReciprocalMatch(Long userId1, Long userId2, List<Market> allMarkets) {
        boolean user1MatchesUser2 = false;
        boolean user2MatchesUser1 = false;

        List<Market> user1Markets = allMarkets.stream()
                .filter(m -> m.getUser().getId().equals(userId1))
                .toList();

        List<Market> user2Markets = allMarkets.stream()
                .filter(m -> m.getUser().getId().equals(userId2))
                .toList();

        for (Market market1 : user1Markets) {
            for (Market market2 : user2Markets) {
                if (market1.getServiceType().getId().equals(market2.getServiceType().getId()) &&
                        market1.getOffer() != market2.getOffer()) {
                    if (market1.getOffer() == 1) {
                        user1MatchesUser2 = true;
                    } else {
                        user2MatchesUser1 = true;
                    }

                    if (user1MatchesUser2 && user2MatchesUser1) {
                        return true;
                    }
                }
            }
        }
        return user1MatchesUser2 && user2MatchesUser1;
    }
    
    /**
     * Findet Matches mit Perfect Match Flag
     * @param offerIds Liste der angebotenen Service-IDs
     * @param demandIds Liste der gesuchten Service-IDs
     * @return Liste von Maps mit Match-Details und isPerfectMatch Flag
     */
    public List<Map<String, Object>> findMatchesWithPerfectMatchFlag(List<Long> offerIds, List<Long> demandIds) {
        List<Market> allMarkets = marketRepository.listAll();
        List<Map<String, Object>> matches = new ArrayList<>();
        Set<String> addedMatches = new HashSet<>();
        
        // Gruppiere Markets nach User
        Map<Long, List<Market>> marketsByUser = new HashMap<>();
        for (Market market : allMarkets) {
            Long userId = market.getUser().getId();
            marketsByUser.computeIfAbsent(userId, k -> new ArrayList<>()).add(market);
        }
        
        // Finde Matches und Perfect Matches
        for (Map.Entry<Long, List<Market>> entry : marketsByUser.entrySet()) {
            Long userId = entry.getKey();
            List<Market> userMarkets = entry.getValue();
            
            // Zähle Matches für diesen User
            int matchCount = 0;
            List<Map<String, Object>> userMatchDetails = new ArrayList<>();
            
            for (Market market : userMarkets) {
                Long serviceTypeId = market.getServiceType().getId();
                boolean isUserOffer = market.getOffer() == 1;
                
                // Check if this market matches needs
                boolean isMatch = false;
                if (isUserOffer && demandIds.contains(serviceTypeId)) {
                    // User bietet an, was gesucht wird
                    isMatch = true;
                } else if (!isUserOffer && offerIds.contains(serviceTypeId)) {
                    // User sucht, was angeboten wird
                    isMatch = true;
                }
                
                if (isMatch) {
                    matchCount++;
                    
                    String matchKey = userId + "-" + serviceTypeId + "-" + market.getOffer();
                    if (!addedMatches.contains(matchKey)) {
                        Map<String, Object> matchDetail = new HashMap<>();
                        matchDetail.put("serviceType", Map.of(
                            "id", market.getServiceType().getId(),
                            "name", market.getServiceType().getName()
                        ));
                        matchDetail.put("offer", market.getOffer());
                        matchDetail.put("user", Map.of(
                            "id", market.getUser().getId(),
                            "name", market.getUser().getName()
                        ));
                        matchDetail.put("isPerfectMatch", false); // Wird später aktualisiert
                        
                        userMatchDetails.add(matchDetail);
                        addedMatches.add(matchKey);
                    }
                }
            }
            
            // Markiere alle Matches dieses Users als Perfect Match falls >= 2
            if (matchCount >= 2) {
                for (Map<String, Object> detail : userMatchDetails) {
                    detail.put("isPerfectMatch", true);
                }
            }
            
            matches.addAll(userMatchDetails);
        }
        
        return matches;
    }
}
