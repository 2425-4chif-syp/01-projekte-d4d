package com.example;

import jakarta.json.Json;
import jakarta.json.JsonArrayBuilder;
import jakarta.json.JsonObject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;

@Path("/d4d")
public class d4dApplication {

    @GET
    @Path("/users")
    @Produces(MediaType.TEXT_PLAIN)
    public String allUsers() {
        String usersNames = "";
        for (User u : UserRepository.getAllUsers()) {
            usersNames += " " + u.getName();
        }
        return usersNames;
    }

    @POST
    @Path("/user")
    @Produces(MediaType.TEXT_PLAIN)
    public Response createUser(JsonObject userJson) {
        User user = new User(
                userJson.getString("name"),
                userJson.getString("serviceOffer"),
                userJson.getString("serviceWanted"),
                userJson.getString("description")
        );
        System.out.println(UserRepository.getAllUsers());
        return Response.ok("User created successfully").build();
    }

    @GET
    @Path("/{service}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response usersByServiceOffer(@PathParam("service") String service) {
        List<User> users = UserRepository.getServices(service);
        JsonArrayBuilder jsonArrayBuilder = Json.createArrayBuilder();

        for (User user : users) {
            JsonObject userJson = Json.createObjectBuilder()
                    .add("name", user.getName())
                    .add("serviceOffer", user.getServiceOffer())
                    .add("serviceWanted", user.getServiceWanted())
                    .add("description", user.getDescription())
                    .build();
            jsonArrayBuilder.add(userJson);
        }

        return Response.ok(jsonArrayBuilder.build()).build();
    }
}
