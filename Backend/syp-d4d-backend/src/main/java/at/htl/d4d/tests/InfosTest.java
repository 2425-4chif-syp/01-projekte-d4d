package at.htl.d4d.tests;

import java.util.*;

import at.htl.d4d.control.MarketRepository;
import at.htl.d4d.control.UserRepository;
import at.htl.d4d.entity.Market;
import at.htl.d4d.entity.User;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class InfosTest {
    @Inject
    MarketRepository marketRepository;

    @Inject
    UserRepository userRepository;

    public List<String> getPerfectMatch() {
        // Hole alle Benutzer, die sowohl Angebote als auch Gesuche haben
        List<String> usersWithOffersAndWants = getUsersWithOffersAndWants();
        Set<String> uniqueUserNames = new HashSet<>();
    
        // Organisiere Daten in Maps für schnellen Zugriff
        Map<Long, Set<Long>> userOffers = new HashMap<>(); // user_ID -> Set<serviceType_ID>
        Map<Long, Set<Long>> userWants = new HashMap<>();  // user_ID -> Set<serviceType_ID>
    
        // Erste Schleife: Alle Märkte durchgehen und in Maps organisieren
        for (Market market : marketRepository.getAllMarkets()) {
            Long userId = market.user_ID;
            if (market.offer == 1) {
                userOffers.computeIfAbsent(userId, k -> new HashSet<>()).add(market.serviceType_ID);
            } else if (market.offer == 0) {
                userWants.computeIfAbsent(userId, k -> new HashSet<>()).add(market.serviceType_ID);
            }
        }
    
        // Zweite Schleife: Kombinationen von Benutzern überprüfen
        List<Long> usersWithBoth = new ArrayList<>();
        for (String userName : usersWithOffersAndWants) {
            User user = userRepository.findUserByName(userName);
            Long userId = user.id;
            if (userId != null && userOffers.containsKey(userId) && userWants.containsKey(userId)) {
                usersWithBoth.add(userId);
            }
        }
    
        for (int i = 0; i < usersWithBoth.size(); i++) {
            Long user1Id = usersWithBoth.get(i);
            Set<Long> offers1 = userOffers.get(user1Id);
            Set<Long> wants1 = userWants.get(user1Id);
    
            for (int j = i + 1; j < usersWithBoth.size(); j++) {
                Long user2Id = usersWithBoth.get(j);
                Set<Long> offers2 = userOffers.get(user2Id);
                Set<Long> wants2 = userWants.get(user2Id);
    
                // Überprüfe Überschneidungen zwischen Angeboten und Gesuchen
                boolean user1OffersWhatUser2Wants = !Collections.disjoint(offers1, wants2);
                boolean user2OffersWhatUser1Wants = !Collections.disjoint(offers2, wants1);
    
                if (user1OffersWhatUser2Wants && user2OffersWhatUser1Wants) {
                    // Perfect Match gefunden! Füge die Benutzernamen zum Set hinzu
                    uniqueUserNames.add(userRepository.findUserById(user1Id));
                    uniqueUserNames.add(userRepository.findUserById(user2Id));
                }
            }
        }
    
        // Konvertiere das Set in eine Liste
        return new ArrayList<>(uniqueUserNames);
    }

    public List<String> getUsersWithOffersAndWants() {
        List<Market> markets = marketRepository.getAllMarkets();
        Set<Long> usersWithOffers = new HashSet<>();
        Set<Long> usersWithWants = new HashSet<>();
    
        // Erste Schleife: Identifiziere Benutzer mit Angeboten und Gesuchen
        for (Market market : markets) {
            Long userId = market.user_ID;
            if (market.offer == 1) {
                usersWithOffers.add(userId); // Benutzer hat ein Angebot
            } else if (market.offer == 0) {
                usersWithWants.add(userId); // Benutzer hat ein Gesuch
            }
        }
    
        // Finde die Schnittmenge von Benutzern, die sowohl Angebote als auch Gesuche haben
        usersWithOffers.retainAll(usersWithWants);
    
        // Zweite Schleife: Hole die Namen der Benutzer aus der Schnittmenge
        List<String> userNames = new ArrayList<>();
        for (Long userId : usersWithOffers) {
            String userName = userRepository.findUserById(userId);
            if (userName != null) { // Sicherstellen, dass der Name nicht null ist
                userNames.add(userName);
            }
        }
    
        return userNames;
    }
}
