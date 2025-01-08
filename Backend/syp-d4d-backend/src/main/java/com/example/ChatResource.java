package com.example;

import jakarta.json.Json;
import jakarta.json.JsonArrayBuilder;
import jakarta.json.JsonObject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;

@Path("/chat/messages")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ChatResource {

    @POST
    public Response receiveMessage(JsonObject userJson) {
        String user = userJson.getString("user");
        String message = userJson.getString("message");

        // Nachricht in der Datenbank speichern
        MessageRepository.saveMessage(user, message);

        return Response.ok(Json.createObjectBuilder()
                .add("user", user)
                .add("message", message)
                .build()).build();
    }

    @GET
    public Response getMessages() {
        List<Message> messages = MessageRepository.getAllMessages();
        JsonArrayBuilder jsonArrayBuilder = Json.createArrayBuilder();

        for (Message msg : messages) {
            jsonArrayBuilder.add(Json.createObjectBuilder()
                    .add("user", msg.getUserName())
                    .add("message", msg.getMessage())
                    .add("createdAt", msg.getCreatedAt().toString()));
        }

        return Response.ok(jsonArrayBuilder.build()).build();
    }
}
