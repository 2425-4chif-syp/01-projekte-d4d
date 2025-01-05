package com.example;

import jakarta.json.Json;
import jakarta.json.JsonArrayBuilder;
import jakarta.json.JsonObject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;

@Path("/d4d")
public class ServiceController {
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
        System.out.println(service.getName());
        System.out.println(service.getServiceOffer());
        System.out.println(service.getDescription());
        System.out.println(service.getServiceWanted());
        return Response.ok("Service created successfully").build();
    }
}