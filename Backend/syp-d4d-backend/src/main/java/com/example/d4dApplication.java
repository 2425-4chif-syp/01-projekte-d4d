package com.example;

import jakarta.json.Json;
import jakarta.json.JsonArrayBuilder;
import jakarta.json.JsonObject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;

@Path("/d4d")
public class d4dApplication {

    @GET
    @Path("/services")
    @Produces(MediaType.TEXT_PLAIN)
    public String allServices() {
        String usersNames = "";
        for (Service s : ServiceRepository.getAllServices()) {
            usersNames += " " + s.getName();
        }
        return usersNames;
    }

    /*
    @POST
    @Path("/service")
    @Produces(MediaType.TEXT_PLAIN)
    public Response createService(JsonObject userJson) {
        Service service = new Service(
                userJson.getString("name"),
                userJson.getString("serviceOffer"),
                userJson.getString("serviceWanted"),
                userJson.getString("description")
        );
        System.out.println(ServiceRepository.getAllServices());

        return Response.ok("Service created successfully").build();
    }
    */

    /*@GET
    @Path("/{service}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response usersByServiceOffer(@PathParam("service") String service) {
        List<Service> services = ServiceRepository.getServices(service);
        JsonArrayBuilder jsonArrayBuilder = Json.createArrayBuilder();

        for (Service s : services) {
            JsonObject userJson = Json.createObjectBuilder()
                    .add("name", s.getName())
                    .add("serviceOffer", s.getServiceOffer())
                    .add("serviceWanted", s.getServiceWanted())
                    .add("description", s.getDescription())
                    .build();
            jsonArrayBuilder.add(userJson);
        }

        return Response.ok(jsonArrayBuilder.build()).build();
    }*/
}