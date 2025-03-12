package at.htl.d4d.tests;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import at.htl.d4d.control.MarketRepository;
import at.htl.d4d.control.UserRepository;
import at.htl.d4d.entity.Market;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class InfosTest {
    @Inject
    MarketRepository marketRepository;

    @Inject
    UserRepository userRepository;

    public List<String> getPerfektMatch() {
        List<Market> markets = marketRepository.getAllMarkets();
        Set<String> uniqueUserNames = new HashSet<>();
        
        // Vergleiche alle Markteinträge miteinander
        for (Market offer1 : markets) {
            // Nur Angebote betrachten (offer == 1)
            if (offer1.offer != 1) {
                continue;
            }
            
            for (Market want1 : markets) {
                // Nur Gesuche betrachten (offer == 0) und vom gleichen Benutzer wie offer1
                if (want1.offer != 0 || !want1.user_ID.equals(offer1.user_ID)) {
                    continue;
                }
                
                // Suche nach einem zweiten Benutzer mit passendem Angebot und Gesuch
                for (Market offer2 : markets) {
                    // Nur Angebote betrachten (offer == 1) und von anderem Benutzer als offer1
                    if (offer2.offer != 1 || offer2.user_ID.equals(offer1.user_ID)) {
                        continue;
                    }
                    
                    // Prüfen, ob das Angebot des zweiten Benutzers zum Gesuch des ersten passt
                    if (offer2.serviceType_ID.equals(want1.serviceType_ID)) {
                        
                        for (Market want2 : markets) {
                            // Nur Gesuche betrachten (offer == 0) vom gleichen Benutzer wie offer2
                            if (want2.offer != 0 || !want2.user_ID.equals(offer2.user_ID)) {
                                continue;
                            }
                            
                            // Prüfen, ob das Gesuch des zweiten Benutzers zum Angebot des ersten passt
                            if (want2.serviceType_ID.equals(offer1.serviceType_ID)) {
                                // Perfect Match gefunden! Füge die Benutzernamen zum Set hinzu
                                String user1Name = userRepository.findUserById(offer1.user_ID);
                                String user2Name = userRepository.findUserById(offer2.user_ID);
                                
                                uniqueUserNames.add(user1Name);
                                uniqueUserNames.add(user2Name);
                            }
                        }
                    }
                }
            }
        }
        
        // Konvertiere das Set in eine Liste
        return new ArrayList<>(uniqueUserNames);
    }
}
