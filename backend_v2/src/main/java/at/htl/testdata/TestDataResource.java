package at.htl.testdata;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("d4d/testdata")
@ApplicationScoped
public class TestDataResource {

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
    /*
    @Inject
    ReviewTestData reviewTestData;*/

    @POST
    @Path("/generate-service-types")
    @Transactional
    public Response generateServiceTypesTestData() {
        serviceTypeTestData.generateServiceTypesTestData();
        return Response.ok("Dienstleistungsarten-Testdaten erfolgreich generiert.").build();
    }

    @POST
    @Path("/generate-users")
    @Transactional
    public Response generateUserTestData() {
        userTestData.generateUserTestData();
        return Response.ok("Benutzer-Testdaten erfolgreich generiert.").build();
    }

    @POST
    @Path("/generate-markets")
    @Transactional
    public Response generateMarketTestData() {
        marketTestData.generateMarketTestData();
        return Response.ok("Marktplatz-Testdaten erfolgreich generiert.").build();
    }

    @POST
    @Path("/generate-services")
    @Transactional
    public Response generateServiceTestData() {
        serviceTestData.generateServiceTestData();
        return Response.ok("Service-Testdaten erfolgreich generiert.").build();
    }

    @POST
    @Path("/generate-chat-entries")
    @Transactional
    public Response generateChatTestData() {
        chatEntryTestData.generateChatEntryTestData();
        return Response.ok("Chat-Testdaten erfolgreich generiert.").build();
    }
    /*
    @POST
    @Path("/generate-reviews")
    @Transactional
    public Response generateReviewTestData() {
        reviewTestData.generateReviewTestData();
        return Response.ok("Review-Testdaten erfolgreich generiert.").build();
    }*/
}