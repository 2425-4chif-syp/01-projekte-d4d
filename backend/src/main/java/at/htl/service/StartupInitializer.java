package at.htl.service;

import at.htl.repository.ServiceTypeRepository;
import at.htl.repository.UserRepository;
import at.htl.testdata.*;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.jboss.logging.Logger;

@ApplicationScoped
public class StartupInitializer {

    private static final Logger LOG = Logger.getLogger(StartupInitializer.class);

    @Inject
    ServiceTypeRepository serviceTypeRepository;

    @Inject
    UserRepository userRepository;

    @Inject
    ServiceTypeTestData serviceTypeTestData;

    @Inject
    UserTestData userTestData;

    @Inject
    MarketTestData marketTestData;

    @Inject
    ServiceTestData serviceTestData;

    @Inject
    ChatEntryTestData chatEntryTestData;

    @Inject
    ReviewTestData reviewTestData;

    @Transactional
    void onStart(@Observes StartupEvent ev) {
        LOG.info("=== Application Startup ===");
        initializeTestData();
    }

    private void initializeTestData() {
        long serviceTypeCount = serviceTypeRepository.count();
        long userCount = userRepository.count();

        if (serviceTypeCount > 0 && userCount > 0) {
            LOG.info("Data already exists (ServiceTypes: " + serviceTypeCount + ", Users: " + userCount + "). Skipping initialization.");
            return;
        }

        LOG.info("No data found. Initializing all test data...");

        // 1. ServiceTypes (Fächer)
        LOG.info("Step 1/6: Generating ServiceTypes...");
        serviceTypeTestData.generateServiceTypesTestData();

        // 2. Users (Testbenutzer)
        LOG.info("Step 2/6: Generating Users...");
        userTestData.generateUserTestData();

        // 3. Markets (Angebote & Nachfragen)
        LOG.info("Step 3/6: Generating Markets...");
        marketTestData.generateMarketTestData();

        // 4. Services (aktive Nachhilfe-Verbindungen)
        LOG.info("Step 4/6: Generating Services...");
        serviceTestData.generateServiceTestData();

        // 5. ChatEntries (Chatnachrichten)
        LOG.info("Step 5/6: Generating ChatEntries...");
        chatEntryTestData.generateChatEntryTestData();

        // 6. Reviews (Bewertungen)
        LOG.info("Step 6/6: Generating Reviews...");
        reviewTestData.generateReviewTestData();

        LOG.info("=== All test data initialized successfully! ===");
    }
}
