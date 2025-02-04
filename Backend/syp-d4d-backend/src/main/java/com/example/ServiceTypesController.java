package com.example;

import jakarta.json.JsonObject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.ArrayList;
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
        List<ServiceType> serviceTypes = ServiceTypesControllerRepository.getServiceTypes();
        List<String> typeOfServices = new ArrayList<>();

        for (var serviceType : serviceTypes) {
            if (serviceType.getDeletedAt() == null) {
                typeOfServices.add(serviceType.getTypeOfService());
            }
        }
        return String.join("|", typeOfServices);
    }

    @GET
    @Path("/allServiceTypes")
    @Produces(MediaType.TEXT_PLAIN)
    public String getAllServiceTypesFromDb() {
        List<ServiceType> serviceTypes = ServiceTypesControllerRepository.getServiceTypes();
        List<String> typeOfServices = new ArrayList<>();

        for (var serviceType : serviceTypes) {
            typeOfServices.add(serviceType.getTypeOfService());
        }
        return String.join("|", typeOfServices);
    }

    @PUT
    @Path("/serviceType/{typeOfService}")
    @Produces(MediaType.TEXT_PLAIN)
    public Response deleteServiceType(@PathParam("typeOfService") String typeOfService) {
        boolean deleted = ServiceTypesControllerRepository.deleteServiceType(typeOfService);
        if (deleted) {
            return Response.ok("ServiceType deleted successfully").build();
        } else {
            return Response.status(Response.Status.NOT_FOUND).entity("ServiceType not found").build();
        }
    }
}