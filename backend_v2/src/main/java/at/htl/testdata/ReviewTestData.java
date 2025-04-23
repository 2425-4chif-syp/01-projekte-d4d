package at.htl.testdata;

import at.htl.entity.Review;
import at.htl.entity.ServiceType;
import at.htl.entity.User;
import at.htl.repository.ReviewRepository;
import at.htl.repository.ServiceTypeRepository;
import at.htl.repository.UserRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;

import java.util.List;
import java.util.Random;

@ApplicationScoped
public class ReviewTestData {
    @Inject
    ReviewRepository reviewRepository;

    @Inject
    UserRepository userRepository;
    @Inject
    ServiceTypeRepository serviceTypeRepository;

    @Inject
    EntityManager entityManager;

    public void generateReviewTestData() {
        entityManager.createNativeQuery("DELETE FROM d4d_review").executeUpdate();

        List<User> allUsers = userRepository.listAll();
        System.out.println("[DEBUG] Found " + allUsers.size() + " users in DB.");

        List<ServiceType> allServiceTypes = serviceTypeRepository.listAll();
        System.out.println("[DEBUG] Found " + allServiceTypes.size() + " service types in DB.");

        if (allUsers.size() < 2 || allServiceTypes.isEmpty()) {
            System.out.println("[WARN] Not enough Users or ServiceTypes to generate reviews!");
            return;
        }

        Random random = new Random();
        int totalReviewsCreated = 0;

        while (totalReviewsCreated < 300) {
            User serviceProvider = allUsers.get(random.nextInt(allUsers.size()));

            User evaluator;
            do {
                evaluator = allUsers.get(random.nextInt(allUsers.size()));
            } while (evaluator.getId().equals(serviceProvider.getId()));

            ServiceType randomServiceType = allServiceTypes.get(random.nextInt(allServiceTypes.size()));
            double rating = 1.0 + (random.nextInt(9) * 0.5);
            String comment = randomComment();

            Review review = new Review(
                    serviceProvider,
                    evaluator,
                    randomServiceType,
                    rating,
                    comment
            );

            reviewRepository.persist(review);
            totalReviewsCreated++;
        }
    }

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
