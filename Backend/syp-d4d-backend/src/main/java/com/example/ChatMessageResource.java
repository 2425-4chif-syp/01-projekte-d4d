package com.example;

import jakarta.json.Json;
import jakarta.json.JsonArrayBuilder;
import jakarta.json.JsonObject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;

@Path("/chat/rooms/{chatId}/messages")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ChatMessageResource {

    @PathParam("chatId")
    int chatId;

    @GET
    public Response getMessages() {
        // Rufe die Nachrichten aus der Datenbank für den gegebenen chatId ab.
        List<Message> messages = MessageRepository.getMessagesByChat(chatId);

        // Erstelle ein JSON-Array aus den Nachrichten
        JsonArrayBuilder arr = Json.createArrayBuilder();
        for (Message m : messages) {
            arr.add(Json.createObjectBuilder()
                    .add("id", m.getId())
                    .add("chatId", m.getChatId())
                    .add("user", m.getUserName())
                    .add("message", m.getMessage())
                    .add("createdAt", m.getCreatedAt().toString())
            );
        }

        return Response.ok(arr.build()).build();
    }

    @POST
    public Response createMessage(JsonObject messageJson) {
        String user = messageJson.getString("user", "");
        String message = messageJson.getString("message", "");
        // Debug-Ausgabe, um sicherzustellen, dass der Endpoint aufgerufen wird:
        System.out.println("Received message for chatId " + chatId + ": " + user + " - " + message);

        // Speichere die Nachricht in der DB
        MessageRepository.saveMessage(chatId, user, message);

        // Sende eine Erfolgsmeldung zurück:
        JsonObject response = Json.createObjectBuilder()
                .add("status", "created")
                .add("chatId", chatId)
                .add("user", user)
                .add("message", message)
                .build();
        return Response.status(Response.Status.CREATED).entity(response).build();
    }
}
