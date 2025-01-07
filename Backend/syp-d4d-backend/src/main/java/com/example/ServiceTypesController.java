package com.example;

import jakarta.json.JsonObject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

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
}
