package at.htl.d4d.endpoints;

import at.htl.d4d.control.ServiceControllerRepository;
import at.htl.d4d.control.ServiceResourceRepository;
import at.htl.d4d.control.UserRepository;
import at.htl.d4d.control.testNewDB_Repository;
import at.htl.d4d.entity.Service;
import at.htl.d4d.entity.User;
import jakarta.inject.Inject;
import jakarta.json.Json;
import jakarta.json.JsonArrayBuilder;
import jakarta.json.JsonObject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;

@Path("/d4d")
public class ServiceResource {

    @GET
    @Path("/{serviceOffer}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getServices(@PathParam("serviceOffer") String serviceOffer) {
        List<Service> services;

        if (serviceOffer.equalsIgnoreCase("all")) {
            services = ServiceResourceRepository.getAllServices();
        } else {
            services = ServiceResourceRepository.getServicesByOffer(serviceOffer);
        }

        System.out.println("----- Dienstleistungsangebote -----");
        if (services.isEmpty()) {
            System.out.println("Keine Einträge gefunden.");
        } else {
            for (Service service : services) {
                System.out.printf("Name: %s, Angebot: %s, Gesucht: %s, Beschreibung: %s%n",
                        service.getName(),
                        service.getServiceOffer(),
                        service.getServiceWanted(),
                        service.getDescription());
            }
        }
        System.out.println("------------------------------------");

        JsonArrayBuilder jsonArrayBuilder = Json.createArrayBuilder();
        for (Service service : services) {
            JsonObject userJson = Json.createObjectBuilder()
                    .add("name", service.getName())
                    .add("serviceOffer", service.getServiceOffer())
                    .add("serviceWanted", service.getServiceWanted())
                    .add("description", service.getDescription())
                    .build();
            jsonArrayBuilder.add(userJson);
        }

        //Testing new DB
        //*******
        testNewDB_Repository.createUserDB();
        testNewDB_Repository.createTypeOfServiceDB();
        testNewDB_Repository.createServiceDB();
        testNewDB_Repository.createMarketDB();
        testNewDB_Repository.createChatEntryDB();
        testNewDB_Repository.createReviewTable();
        //*******

        return Response.ok(jsonArrayBuilder.build()).build();
    }

    @GET
    @Path("/search/name/{name}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response searchByName(@PathParam("name") String name) {
        List<Service> services = ServiceResourceRepository.searchByName(name);

        JsonArrayBuilder jsonArrayBuilder = Json.createArrayBuilder();
        for (Service service : services) {
            JsonObject userJson = Json.createObjectBuilder()
                    .add("name", service.getName())
                    .add("serviceOffer", service.getServiceOffer())
                    .add("serviceWanted", service.getServiceWanted())
                    .add("description", service.getDescription())
                    .build();
            jsonArrayBuilder.add(userJson);
        }

        return Response.ok(jsonArrayBuilder.build()).build();
    }

    @GET
    @Path("/search/description/{term}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response searchInDescription(@PathParam("term") String term) {
        List<Service> services = ServiceResourceRepository.searchInDescription(term);

        JsonArrayBuilder jsonArrayBuilder = Json.createArrayBuilder();
        for (Service service : services) {
            JsonObject userJson = Json.createObjectBuilder()
                    .add("name", service.getName())
                    .add("serviceOffer", service.getServiceOffer())
                    .add("serviceWanted", service.getServiceWanted())
                    .add("description", service.getDescription())
                    .build();
            jsonArrayBuilder.add(userJson);
        }

        return Response.ok(jsonArrayBuilder.build()).build();
    }

    @Inject
    UserRepository userRepository;

    @POST
    @Path("/service")
    @Produces(MediaType.TEXT_PLAIN)
    @Transactional
    public Response createService(JsonObject userJson) {
        Service service = new Service(
                userJson.getString("name"),
                userJson.getString("serviceOffer"),
                userJson.getString("serviceWanted"),
                userJson.getString("description")
        );

        String userName = userJson.getString("name");

        if (!userRepository.existsByName(userName)) {
            User newUser = new User(userName);
            userRepository.persist(newUser);
            return Response.ok("User created successfully!").build();
        }

        return Response.ok("Service created successfully").build();
    }
}
