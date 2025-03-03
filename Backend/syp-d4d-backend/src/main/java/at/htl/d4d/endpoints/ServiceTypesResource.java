package at.htl.d4d.endpoints;

import at.htl.d4d.control.ServiceTypesRepository;
import at.htl.d4d.entity.ServiceType;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Path("/d4d")
public class ServiceTypesResource {

    @Inject
    ServiceTypesRepository repository;

    @POST
    @Path("/serviceType")
    @Produces(MediaType.TEXT_PLAIN)
    @Consumes(MediaType.TEXT_PLAIN)
    public Response addServiceType(String typeOfService) {
        repository.addServiceType(typeOfService);
        return Response.ok("ServiceType added successfully").build();
    }

    @GET
    @Path("/serviceTypes")
    @Produces(MediaType.TEXT_PLAIN)
    public String getServiceTypes() {
        repository.addServiceType("Computerarchitektur und Betriebssysteme");
        repository.addServiceType("Programmierung und Software Engineering");
        repository.addServiceType("Datenbanken und Informationssysteme");
        repository.addServiceType("Netzwerksysteme & Cyber Security");
        repository.addServiceType("Webprogrammierung und Mobile Computing");
        repository.addServiceType("Data Science und Artificial Intelligence");
        repository.addServiceType("Rechnungswesen");
        repository.addServiceType("Betriebliche Organisation");
        repository.addServiceType("Recht");
        repository.addServiceType("Systemplanung und Projektentwicklung");
        repository.addServiceType("Physik");
        repository.addServiceType("Chemie");
        repository.addServiceType("Angewandte Mathematik");
        repository.addServiceType("Deutsch");
        repository.addServiceType("Englisch");

        List<String> typeOfServices = repository.getActiveServiceTypes()
                .stream()
                .map(serviceType -> serviceType.getTypeOfService())
                .collect(Collectors.toList());

        return String.join("|", typeOfServices);
    }

    @GET
    @Path("/allServiceTypes")
    @Produces(MediaType.TEXT_PLAIN)
    public String getAllServiceTypesFromDb() {
        List<String> typeOfServices = repository.getAllServiceTypes()
                .stream()
                .map(serviceType -> serviceType.getTypeOfService())
                .collect(Collectors.toList());

        return String.join("|", typeOfServices);
    }

    @PUT
    @Path("/serviceType/{typeOfService}")
    @Produces(MediaType.TEXT_PLAIN)
    public Response deleteServiceType(@PathParam("typeOfService") String typeOfService) {
        boolean deleted = repository.deleteServiceType(typeOfService);
        if (deleted) {
            return Response.ok("ServiceType deleted successfully").build();
        } else {
            return Response.status(Response.Status.NOT_FOUND).entity("ServiceType not found").build();
        }
    }
}