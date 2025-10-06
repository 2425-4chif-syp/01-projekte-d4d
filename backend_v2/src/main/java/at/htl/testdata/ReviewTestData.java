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
        
        if (allServices.isEmpty()) {
            return;
        }

        Collections.shuffle(allServices);
        
        // 75% of all services get a review
        int reviewCount = (int) Math.ceil(allServices.size() * 0.75);
        List<Service> servicesToReview = allServices.subList(0, Math.min(reviewCount, allServices.size()));

        Random random = new Random();

        for (Service service : servicesToReview) {
            double rating = generateRating(random);
            String comment = generateComment(rating, random);
            
            Review review = new Review(service, rating, comment);
            reviewRepository.persist(review);
        }
    }

    private double generateRating(Random random) {
        // Generate ratings with tendency towards positive (more realistic distribution)
        double value = random.nextDouble();
        
        if (value < 0.5) {
            // 50% chance for 4.0-5.0 (very good)
            return 4.0 + random.nextDouble();
        } else if (value < 0.8) {
            // 30% chance for 3.0-3.9 (good)
            return 3.0 + random.nextDouble();
        } else {
            // 20% chance for 1.0-2.9 (average to poor)
            return 1.0 + random.nextDouble() * 2.0;
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
