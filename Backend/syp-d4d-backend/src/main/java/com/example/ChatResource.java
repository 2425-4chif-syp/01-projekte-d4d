package com.example;

import jakarta.json.Json;
import jakarta.json.JsonArrayBuilder;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;

@Path("/chat/default/messages")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ChatResource {

    @GET
    public Response getMessages() {
        // Beispiel: Standard-Chat-ID 1
        int defaultChatId = 1;
        List<Message> messages = MessageRepository.getMessagesByChat(defaultChatId);
        JsonArrayBuilder jsonArrayBuilder = Json.createArrayBuilder();
        for (Message msg : messages) {
            jsonArrayBuilder.add(Json.createObjectBuilder()
                    .add("id", msg.getId())
                    .add("chatId", msg.getChatId())
                    .add("user", msg.getUserName())
                    .add("message", msg.getMessage())
                    .add("createdAt", msg.getCreatedAt().toString()));
        }
        return Response.ok(jsonArrayBuilder.build()).build();
    }
}
