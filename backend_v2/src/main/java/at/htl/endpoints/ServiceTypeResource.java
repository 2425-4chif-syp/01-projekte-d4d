package at.htl.endpoints;

import at.htl.entity.ServiceType;
import at.htl.repository.ServiceTypeRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;

@Path("servicetype")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@ApplicationScoped
public class ServiceTypeResource {
    @Inject
    ServiceTypeRepository serviceTypeRepository;

    @GET
    @Transactional
    public Response getServiceTypes() {
        List<ServiceType> serviceTypes = serviceTypeRepository
                .list("deletedAt is null order by name");

        if (serviceTypes.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Keine Servicetypen gefunden!").build();
        }
        return Response.ok(serviceTypes).build();
    }

    @POST
    @Transactional
    public Response addServiceType(ServiceType serviceType) {
        serviceTypeRepository.persist(serviceType);
        return Response.status(Response.Status.CREATED).entity(serviceType).build();
    }
}
