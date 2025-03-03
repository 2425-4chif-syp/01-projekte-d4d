package at.htl.d4d.endpoints;

import at.htl.d4d.tests.UserTestData;
import at.htl.d4d.tests.MarketTestData;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("d4d/testdata")
@ApplicationScoped
public class TestDataResource {
    @Inject
    UserTestData userTestData;
    
    @Inject
    MarketTestData marketTestData;
    
    @POST
    @Path("/generate-users")
    @Produces(MediaType.TEXT_PLAIN)
    public Response generateUserTestData() {
        userTestData.generateUserTestData();
        return Response.ok("Benutzer-Testdaten erfolgreich generiert.").build();
    }
    
    @POST
    @Path("/generate-market")
    @Produces(MediaType.TEXT_PLAIN)
    @Transactional
    public Response generateMarketTestData() {
        marketTestData.generateMarketTestData();
        return Response.ok("Marktplatz-Testdaten erfolgreich generiert.").build();
    }
}