package at.htl.d4d.control;

import at.htl.d4d.entity.Market;
import at.htl.d4d.entity.Service;
import at.htl.d4d.entity.User;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.*;

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
        
        // Sammle alle Angebote und Nachfragen des angegebenen Benutzers
        Map<Long, Boolean> userServiceTypes = new HashMap<>(); // serviceType_ID -> isOffer
        
        for (Market market : allMarkets) {
            if (market.user_ID.equals(user.id)) {
                // true für Angebote (offer=1), false für Nachfragen (offer=0)
                userServiceTypes.put(market.serviceType_ID, market.offer == 1);
            }
        }
        
        // Wenn der Benutzer keine Angebote oder Nachfragen hat
        if (userServiceTypes.isEmpty()) {
            return perfectMatches;
        }
        
        // Potenzielle Matches zählen
        Map<Long, Integer> matchCountsByUser = new HashMap<>();
        
        // Gehe alle anderen Benutzer durch und prüfe auf Perfect Matches
        for (Market otherMarket : allMarkets) {
            // Überspringe Einträge des anfragenden Benutzers
            if (otherMarket.user_ID.equals(user.id)) {
                continue;
            }
            
            // Perfect Match: 
            // 1. Der aktuelle Benutzer hat eine Nachfrage (offer=0) und der andere Benutzer bietet das an (offer=1)
            // ODER
            // 2. Der aktuelle Benutzer bietet etwas an (offer=1) und der andere Benutzer fragt das nach (offer=0)
            
            Boolean userIsOfferingThisType = userServiceTypes.get(otherMarket.serviceType_ID);
            
            if (userIsOfferingThisType != null) {
                // Benutzer hat einen Eintrag für diesen Servicetyp
                
                // userIsOfferingThisType = true -> Benutzer bietet an, andere Benutzer müssen nachfragen (offer=0)
                // userIsOfferingThisType = false -> Benutzer fragt nach, andere Benutzer müssen anbieten (offer=1)
                
                // XOR Operation: Wenn einer anbietet und einer nachfragt
                if ((userIsOfferingThisType && otherMarket.offer == 0) || 
                    (!userIsOfferingThisType && otherMarket.offer == 1)) {
                    
                    // Zähle das potenzielle Match
                    matchCountsByUser.put(otherMarket.user_ID, 
                                          matchCountsByUser.getOrDefault(otherMarket.user_ID, 0) + 1);
                }
            }
        }
        
        // Nur Benutzer mit mindestens 2 gegenseitigen Matches prüfen (Angebot und Nachfrage)
        for (Long otherUserId : matchCountsByUser.keySet()) {
            if (matchCountsByUser.get(otherUserId) >= 2) {
                // Prüfe gegenseitiges Match
                if (hasReciprocalMatch(user.id, otherUserId, allMarkets)) {
                    
                    // Füge alle Markteinträge dieses Benutzers hinzu, die mit unseren übereinstimmen
                    for (Market otherMarket : allMarkets) {
                        if (otherMarket.user_ID.equals(otherUserId)) {
                            Boolean userIsOfferingThisType = userServiceTypes.get(otherMarket.serviceType_ID);
                            
                            if (userIsOfferingThisType != null &&
                                ((userIsOfferingThisType && otherMarket.offer == 0) ||
                                 (!userIsOfferingThisType && otherMarket.offer == 1))) {
                                
                                perfectMatches.add(otherMarket);
                            }
                        }
                    }
                }
            }
        }
        
        return perfectMatches;
    }
    
    // Hilfsmethode, die prüft ob zwei Benutzer gegenseitig passende Angebote/Nachfragen haben
    private boolean hasReciprocalMatch(Long userId1, Long userId2, List<Market> allMarkets) {
        // Maps für Angebote und Nachfragen beider Benutzer vorbereiten
        Set<Long> user1Offers = new HashSet<>();
        Set<Long> user1Wants = new HashSet<>();
        Set<Long> user2Offers = new HashSet<>();
        Set<Long> user2Wants = new HashSet<>();
        
        // Alle Märkte durchgehen und Angebote/Nachfragen sammeln
        for (Market market : allMarkets) {
            if (market.user_ID.equals(userId1)) {
                if (market.offer == 1) {
                    user1Offers.add(market.serviceType_ID);
                } else {
                    user1Wants.add(market.serviceType_ID);
                }
            } else if (market.user_ID.equals(userId2)) {
                if (market.offer == 1) {
                    user2Offers.add(market.serviceType_ID);
                } else {
                    user2Wants.add(market.serviceType_ID);
                }
            }
        }
        
        // Prüfe gegenseitige Überschneidungen
        boolean user1OffersWhatUser2Wants = false;
        boolean user2OffersWhatUser1Wants = false;
        
        for (Long serviceType : user1Offers) {
            if (user2Wants.contains(serviceType)) {
                user1OffersWhatUser2Wants = true;
                break;
            }
        }
        
        for (Long serviceType : user2Offers) {
            if (user1Wants.contains(serviceType)) {
                user2OffersWhatUser1Wants = true;
                break;
            }
        }
        
        // Es ist ein reciprocal Match, wenn beide wahr sind
        return user1OffersWhatUser2Wants && user2OffersWhatUser1Wants;
    }
}
