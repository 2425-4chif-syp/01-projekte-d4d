package at.htl.testdata;

import at.htl.entity.Review;
import at.htl.entity.Service;
import at.htl.repository.ReviewRepository;
import at.htl.repository.ServiceRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

@ApplicationScoped
public class ReviewTestData {
    @Inject
    ReviewRepository reviewRepository;

    @Inject
    ServiceRepository serviceRepository;

    @Inject
    EntityManager entityManager;

    private static final String[] POSITIVE_COMMENTS = {
            "Ausgezeichneter Service! Sehr zufrieden.",
            "Schnell und professionell. Gerne wieder!",
            "Top Qualität und freundlicher Kontakt.",
            "Sehr empfehlenswert. Alles bestens gelaufen.",
            "Perfekte Abwicklung. Danke!",
            "Hervorragende Arbeit. Bin begeistert!",
            "Sehr kompetent und zuverlässig.",
            "Tolle Leistung. Vielen Dank!"
    };

    private static final String[] NEUTRAL_COMMENTS = {
            "Solider Service. Ganz okay.",
            "Durchschnittliche Leistung. Nichts Besonderes.",
            "Ging so. Könnte besser sein.",
            "In Ordnung, aber Luft nach oben.",
            "Akzeptabel. Preis-Leistung passt.",
            "Standardmäßige Ausführung. Alles okay."
    };

    private static final String[] NEGATIVE_COMMENTS = {
            "Leider nicht zufrieden. Erwartungen nicht erfüllt.",
            "Service war enttäuschend.",
            "Hatte mir mehr erhofft. Schade.",
            "Unprofessionell und langsam.",
            "Nicht empfehlenswert. Qualität mangelhaft.",
            "Sehr enttäuschend. Nicht wieder."
    };

    public void generateReviewTestData() {
        entityManager.createNativeQuery("DELETE FROM d4d_review").executeUpdate();

        List<Service> allServices = serviceRepository.listAll();
        if (allServices.isEmpty()) return;

        Collections.shuffle(allServices);

        // 40 % der Services bekommen Bewertungen
        int reviewCount = (int) Math.ceil(allServices.size() * 0.4);
        List<Service> servicesToReview = allServices.subList(0, Math.min(reviewCount, allServices.size()));

        Random random = new Random();

        for (Service service : servicesToReview) {
            double rating = generateHalfStepRating(random);
            String comment = generateComment(rating, random);
            Review review = new Review(service, rating, comment);
            reviewRepository.persist(review);
        }
    }

    private double generateHalfStepRating(Random random) {
        double[] possibleRatings = {1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0};
        double value = random.nextDouble();

        if (value < 0.5) {
            return possibleRatings[6 + random.nextInt(3)];
        } else if (value < 0.8) {
            return possibleRatings[4 + random.nextInt(2)];
        } else {
            return possibleRatings[random.nextInt(4)];
        }
    }

    private String generateComment(double rating, Random random) {
        if (rating >= 4.0) {
            return POSITIVE_COMMENTS[random.nextInt(POSITIVE_COMMENTS.length)];
        } else if (rating >= 3.0) {
            return NEUTRAL_COMMENTS[random.nextInt(NEUTRAL_COMMENTS.length)];
        } else {
            return NEGATIVE_COMMENTS[random.nextInt(NEGATIVE_COMMENTS.length)];
        }
    }
}
