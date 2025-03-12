package at.htl.d4d.endpoints;

import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import java.util.List;

import at.htl.d4d.tests.InfosTest;

@Path("/infos")
public class Infos {

    @Inject
    InfosTest infosTest;

    @GET
    @Path("/perfekt-match")
    @Produces(MediaType.APPLICATION_JSON)
    public List<String> getPerfektMatch() {
        List<String> perfektMatches = infosTest.getPerfektMatch();

        return perfektMatches;
    }
}