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
    @Path("/perfect-match")
    @Produces(MediaType.APPLICATION_JSON)
    public List<String> getPerfectMatch() {
        List<String> perfectMatches = infosTest.getPerfectMatch();

        return perfectMatches;
    }

    @GET
    @Path("/users-with-offers-and-wants")
    @Produces(MediaType.APPLICATION_JSON)
    public List<String> getUsersWithOffersAndWants() {
        List<String> usersWithOffersAndWants = infosTest.getUsersWithOffersAndWants();

        return usersWithOffersAndWants;
    }
}