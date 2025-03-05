package at.htl.d4d.endpoints;

import at.htl.d4d.tests.ServiceTestData;
import at.htl.d4d.tests.ServiceTypesTestData;
import at.htl.d4d.tests.UserTestData;
import at.htl.d4d.tests.MarketTestData;
import at.htl.d4d.tests.ChatTestData; // <-- Neu hinzugefügt
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
    ServiceTypesTestData serviceTypesTestData;

    @Inject
    UserTestData userTestData;

    @Inject
    MarketTestData marketTestData;

    @Inject
    ServiceTestData serviceTestData;

    @Inject
    ChatTestData chatTestData; // <-- Neu hinzugefügt

    @POST
    @Path("/generate-service-types")
    @Produces(MediaType.TEXT_PLAIN)
    public Response generateServiceTypesTestData() {
        serviceTypesTestData.generateServiceTypesTestData();
        return Response.ok("Dienstleistungsarten-Testdaten erfolgreich generiert.").build();
    }

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

    @POST
    @Path("/generate-service")
    @Produces(MediaType.TEXT_PLAIN)
    public Response generateServiceTestData() {
        serviceTestData.generateServiceTestData();
        return Response.ok("Service-Testdaten erfolgreich generiert.").build();
    }

    /**
     * Neuer Endpunkt für das Generieren von Chat-Testdaten.
     * Ruft die generateChatTestData() aus deiner ChatTestData-Klasse auf.
     */
    @POST
    @Path("/generate-chat")
    @Produces(MediaType.TEXT_PLAIN)
    @Transactional
    public Response generateChatTestData() {
        chatTestData.generateChatTestData();
        return Response.ok("Chat-Testdaten erfolgreich generiert.").build();
    }
}
