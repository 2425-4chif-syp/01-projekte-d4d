package com.example;

import javax.inject.Inject;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import java.util.List;

@Path("/dienstleistungen")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class DienstleistungResource {

    @Inject
    DienstleistungRepository dienstleistungRepository;

    @GET
    @Path("/filter")
    public List<Dienstleistung> filterByType(@QueryParam("type") String type) {
        if (type == null || type.isEmpty()) {
            return dienstleistungRepository.listAll();
        }
        return dienstleistungRepository.findByServiceType(type);
    }
}
