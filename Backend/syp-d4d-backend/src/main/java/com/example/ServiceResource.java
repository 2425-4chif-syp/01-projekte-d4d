package com.example;

import jakarta.json.Json;
import jakarta.json.JsonArrayBuilder;
import jakarta.json.JsonObject;
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
}
