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

        // Falls nur 1 User existiert oder keine ServiceTypes, kann man keine sinnvollen Reviews anlegen
        if (allUsers.size() < 2 || allServiceTypes.isEmpty()) {
            System.out.println("[WARN] Not enough Users or ServiceTypes to generate reviews!");
            return;
        }

        Random random = new Random();
        int totalReviewsCreated = 0;

        // 3) Für jeden User generieren wir ein paar Reviews (1 bis 5),
        //    bis wir die MAX_REVIEW_ENTRIES erreicht haben.
        for (User evaluatee : allUsers) {
            // Wie viele Reviews legen wir für diesen evaluatee an? (1..5)
            int reviewCount = 1 + random.nextInt(5);

            for (int i = 0; i < reviewCount; i++) {
                if (totalReviewsCreated >= MAX_REVIEW_ENTRIES) {
                    break;
                }

                // Finde einen anderen User als Evaluator
                User evaluator;
                do {
                    evaluator = allUsers.get(random.nextInt(allUsers.size()));
                } while (evaluator.id.equals(evaluatee.id));

                // Wähle zufälliges ServiceType
                ServiceType randomServiceType = allServiceTypes.get(random.nextInt(allServiceTypes.size()));
                // Passe das an deine ServiceType-Entität an (hier: getTypeOfService())
                String serviceName = randomServiceType.getTypeOfService();

                // Rating zwischen 1.0 und 5.0 (in 0.5er-Schritten)
                double rating = 1.0 + (random.nextInt(9) * 0.5);

                // Kommentar
                String comment = randomComment();

                // Neues Review-Objekt anlegen
                Review review = new Review(
                        evaluatee.name,      // evaluateeUsername
                        evaluator.name,      // evaluatorUsername
                        serviceName,         // serviceType
                        rating,
                        comment
                );

                // Persistieren
                reviewRepository.persist(review);
                totalReviewsCreated++;
            }

            if (totalReviewsCreated >= MAX_REVIEW_ENTRIES) {
                break;
            }
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
