package at.htl.service;

import at.htl.entity.User;
import at.htl.repository.UserRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

/**
 * Service für Keycloak-Benutzer-Informationen.
 * Konstruiert HTL-Email-Adressen aus Keycloak-Benutzerdaten.
 */
@ApplicationScoped
public class KeycloakUserService {

    private static final Logger LOG = Logger.getLogger(KeycloakUserService.class);

    @Inject
    UserRepository userRepository;

    /**
     * Konstruiert die HTL-Email-Adresse eines Benutzers.
     * Format: erster_buchstabe_vorname.nachname@students.htl-leonding.ac.at
     * 
     * Beispiel: "Leon Zehetner" → "l.zehetner@students.htl-leonding.ac.at"
     * 
     * @param pupilId Die Keycloak User-ID (z.B. "if210133")
     * @return Email-Adresse oder null wenn User nicht gefunden
     */
    public String getUserEmail(String pupilId) {
        if (pupilId == null || pupilId.isBlank()) {
            LOG.warn("Cannot get email: pupilId is null or blank");
            return null;
        }

        User user = userRepository.find("pupilId", pupilId).firstResult();
        if (user == null) {
            LOG.warn("Cannot get email: User with pupilId '" + pupilId + "' not found");
            return null;
        }

        String fullName = user.getName();
        if (fullName == null || fullName.isBlank()) {
            LOG.warn("Cannot get email: User '" + pupilId + "' has no name");
            return null;
        }

        return constructEmailFromName(fullName);
    }

    /**
     * Konstruiert Email-Adresse aus Vor- und Nachname.
     * Format: erster_buchstabe_vorname.nachname@students.htl-leonding.ac.at
     * 
     * @param fullName Vollständiger Name (z.B. "Leon Zehetner" oder "Zehetner Leon")
     * @return Email-Adresse
     */
    private String constructEmailFromName(String fullName) {
        fullName = fullName.trim();
        
        // Split bei Leerzeichen
        String[] parts = fullName.split("\\s+");
        
        if (parts.length < 2) {
            LOG.warn("Name '" + fullName + "' has less than 2 parts, using as-is");
            return fullName.toLowerCase() + "@students.htl-leonding.ac.at";
        }

        // Annahme: Erster Teil = Vorname, Letzter Teil = Nachname
        // (bei "Leon Zehetner" → Vorname=Leon, Nachname=Zehetner)
        String firstName = parts[0];
        String lastName = parts[parts.length - 1];

        // Format: l.zehetner@students.htl-leonding.ac.at
        String email = firstName.charAt(0) + "." + lastName.toLowerCase() + "@students.htl-leonding.ac.at";
        email = email.toLowerCase();

        LOG.info("Constructed email for '" + fullName + "': " + email);
        return email;
    }

    /**
     * Testet die Email-Konstruktion (für Debugging).
     */
    public String testEmailConstruction(String fullName) {
        return constructEmailFromName(fullName);
    }
}
