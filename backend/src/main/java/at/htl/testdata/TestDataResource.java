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

    @Inject
    ReviewTestData reviewTestData;

    private Response disabled() {
        return Response.status(Response.Status.GONE)
                .entity("Testdata endpoints are disabled in production.")
                .build();
    }

    @POST
    @Path("/generate-service-types")
    @Transactional
    public Response generateServiceTypesTestData() {
        return disabled();
    }

    @POST
    @Path("/generate-users")
    @Transactional
    public Response generateUserTestData() {
        return disabled();
    }

    @POST
    @Path("/generate-markets")
    @Transactional
    public Response generateMarketTestData() {
        return disabled();
    }

    @POST
    @Path("/generate-services")
    @Transactional
    public Response generateServiceTestData() {
        return disabled();
    }

    @POST
    @Path("/generate-chat-entries")
    @Transactional
    public Response generateChatTestData() {
        return disabled();
    }

    @POST
    @Path("/generate-reviews")
    @Transactional
    public Response generateReviewTestData() {
        return disabled();
    }
}