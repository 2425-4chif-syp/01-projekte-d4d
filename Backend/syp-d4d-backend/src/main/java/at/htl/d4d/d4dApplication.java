package at.htl.d4d;

import at.htl.d4d.control.ServiceRepository;
import at.htl.d4d.entity.Service;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;

@Path("/d4d")
public class d4dApplication {

    @GET
    @Path("/services")
    @Produces(MediaType.TEXT_PLAIN)
    public String allServices() {
        return "";
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