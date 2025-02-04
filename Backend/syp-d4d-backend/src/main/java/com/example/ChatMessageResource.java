package com.example;

import jakarta.json.Json;
import jakarta.json.JsonArrayBuilder;
import jakarta.json.JsonObject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/chat/rooms/{chatId}/messages")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ChatMessageResource {

    @PathParam("chatId")
    int chatId;

    @GET
    public Response getMessages() {
        // Beispiel: Nachrichten abrufen (hier evtl. leeres Array, wenn noch keine Nachrichten vorhanden)
        JsonArrayBuilder arr = Json.createArrayBuilder();
        // Falls du Nachrichten aus der DB laden möchtest, rufe hier MessageRepository.getMessagesByChat(chatId) auf
        return Response.ok(arr.build()).build();
    }

    @POST
    public Response createMessage(JsonObject messageJson) {
        String user = messageJson.getString("user", "");
        String message = messageJson.getString("message", "");
        // Debug-Ausgabe, um sicherzustellen, dass der Endpoint aufgerufen wird:
        System.out.println("Received message for chatId " + chatId + ": " + user + " - " + message);

        // Hier wird die Nachricht in der DB gespeichert:
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
