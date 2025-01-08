package com.example;

import jakarta.json.JsonObject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;

@Path("/d4d")
public class ServiceTypesController {
    @POST
    @Path("/serviceType")
    @Produces(MediaType.TEXT_PLAIN)
    @Consumes(MediaType.TEXT_PLAIN)
    public Response addServiceType(String typeOfService) {
        ServiceTypesControllerRepository.fillServiceTypesDB(typeOfService);
        return Response.ok("ServiceType added successfully").build();
    }

    @GET
    @Path("/serviceTypes")
    @Produces(MediaType.TEXT_PLAIN)
    public String getServiceTypes() {
        List<String> serviceTypes = ServiceTypesControllerRepository.getServiceTypes();
        return String.join("|", serviceTypes);
    }
}