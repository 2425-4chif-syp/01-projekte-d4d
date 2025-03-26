package at.htl.d4d.tests;

import at.htl.d4d.control.ReviewRepository;
import at.htl.d4d.control.UserRepository;
import at.htl.d4d.control.ServiceTypesRepository;
import at.htl.d4d.entity.Review;
import at.htl.d4d.entity.User;
import at.htl.d4d.entity.ServiceType;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.Random;

@ApplicationScoped
public class ReviewTestData {

    @Inject
    ReviewRepository reviewRepository;

    @Inject
    UserRepository userRepository;

    @Inject
    ServiceTypesRepository serviceTypesRepository;

    // Maximale Anzahl an Reviews, die wir generieren
    private static final int MAX_REVIEW_ENTRIES = 300;

    @Transactional
    public void generateReviewTestData() {
        System.out.println("[INFO] Starting generation of review test data...");

        // 1) Lade alle User
        List<User> allUsers = userRepository.getAllUsers();
        System.out.println("[DEBUG] Found " + allUsers.size() + " users in DB.");

        // 2) Lade alle ServiceTypes
        List<ServiceType> allServiceTypes = serviceTypesRepository.getAllServiceTypes();
        System.out.println("[DEBUG] Found " + allServiceTypes.size() + " service types in DB.");

        // Falls weniger als 2 User oder keine ServiceTypes existieren, können keine sinnvollen Reviews erstellt werden
        if (allUsers.size() < 2 || allServiceTypes.isEmpty()) {
            System.out.println("[WARN] Not enough Users or ServiceTypes to generate reviews!");
            return;
        }

        Random random = new Random();
        int totalReviewsCreated = 0;

        // 3) Generiere Reviews, bis MAX_REVIEW_ENTRIES erreicht ist
        while (totalReviewsCreated < MAX_REVIEW_ENTRIES) {
            // Wähle einen zufälligen Service-Provider (derjenige, dessen Service bewertet wird)
            User serviceProvider = allUsers.get(random.nextInt(allUsers.size()));

            // Wähle einen Evaluator, der ungleich dem Service-Provider ist
            User evaluator;
            do {
                evaluator = allUsers.get(random.nextInt(allUsers.size()));
            } while (evaluator.id.equals(serviceProvider.id));

            // Wähle zufälligen ServiceType und erhalte den Typnamen
            ServiceType randomServiceType = allServiceTypes.get(random.nextInt(allServiceTypes.size()));
            String serviceName = randomServiceType.getTypeOfService();

            // Rating zwischen 1.0 und 5.0 (in 0.5er-Schritten)
            double rating = 1.0 + (random.nextInt(9) * 0.5);

            // Zufälliger Kommentar
            String comment = randomComment();

            // Neues Review-Objekt: Hier wird als evaluateeUsername der Service-Provider gesetzt,
            // evaluatorUsername ist der bewertende Nutzer und serviceType der bewertete Service-Typ.
            Review review = new Review(
                    serviceProvider.name,   // Service-Provider, dessen Service bewertet wird
                    evaluator.name,         // Bewertender Nutzer
                    serviceName,            // Der Service-Typ, der bewertet wird
                    rating,
                    comment
            );

            // Persistiere das Review
            reviewRepository.persist(review);
            totalReviewsCreated++;
        }

        System.out.println("[INFO] Finished generating reviews. Total created: " + totalReviewsCreated);
    }

    /**
     * Erzeugt zufällige Kommentare aus einer kleinen Liste.
     */
    private String randomComment() {
        String[] comments = {
                "Sehr hilfreich!",
                "Top Leistung!",
                "Gerne wieder!",
                "War okay.",
                "Hätte mehr erwartet.",
                "Wirklich super erklärt!",
                "Könnte besser sein.",
                "Alles prima gelaufen."
        };
        Random random = new Random();
        return comments[random.nextInt(comments.length)];
    }
}
