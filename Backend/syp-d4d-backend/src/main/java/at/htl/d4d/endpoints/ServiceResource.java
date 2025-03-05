package at.htl.d4d.endpoints;

import at.htl.d4d.control.ServiceRepository;
import at.htl.d4d.control.ServiceTypesRepository;
import at.htl.d4d.control.UserRepository;
import at.htl.d4d.entity.Market;
import at.htl.d4d.entity.Service;
import at.htl.d4d.entity.ServiceType;
import at.htl.d4d.entity.User;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Response;

import java.util.List;


@Path("/d4d")
public class ServiceResource {
    @Inject
    ServiceRepository serviceRepository;

    @Inject
    UserRepository userRepository;

    @Inject
    ServiceTypesRepository serviceTypesRepository;

    @GET
    @Path("/{username}/services")
    public Response getUserServices(@PathParam("username") String username) {
        User user = userRepository.findUserByName(username);
        
        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        
        List<Market> services = serviceRepository.getServicesByUser(user);

        if (services == null || services.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(services).build();
    }


    @GET
    @Path("/{serviceTypeId}/type/services")
    public Response getServicesTypeByTypeId(@PathParam("serviceTypeId") Long serviceTypeId) {
        String type = serviceTypesRepository.findServiceTypeById(serviceTypeId);

        if (type == null || type.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(type).build();
    }

    @GET
    @Path("/{userId}/username/services")
    public Response getUserNameByUserId(@PathParam("userId") Long userId) {
        String name = userRepository.findUserById(userId);

        if (name == null || name.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(name).build();
    }
}