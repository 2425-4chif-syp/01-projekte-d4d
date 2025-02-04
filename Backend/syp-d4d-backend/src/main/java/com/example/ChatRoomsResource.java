package com.example;

import jakarta.json.Json;
import jakarta.json.JsonArrayBuilder;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;

@Path("/chat/rooms")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ChatRoomsResource {

    @POST
    public Response createChat(jakarta.json.JsonObject chatJson) {
        String chatName = chatJson.getString("chatName", "").trim();
        if (chatName.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Json.createObjectBuilder()
                            .add("error", "Chat name must not be empty")
                            .build())
                    .build();
        }
        try {
            ChatRepository.saveChat(chatName);
            return Response.status(Response.Status.CREATED)
                    .entity(Json.createObjectBuilder()
                            .add("chatName", chatName)
                            .build())
                    .build();
        } catch (Exception e) {
            // Fehler wird hier an den Client weitergereicht
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Json.createObjectBuilder()
                            .add("error", "Could not create chat: " + e.getMessage())
                            .build())
                    .build();
        }
    }

    @GET
    public Response getChats() {
        List<Chat> chats = ChatRepository.getAllChats();
        JsonArrayBuilder jsonArrayBuilder = Json.createArrayBuilder();

        for (Chat chat : chats) {
            jsonArrayBuilder.add(Json.createObjectBuilder()
                    .add("chatName", chat.getChatName())
                    .add("createdAt", chat.getCreatedAt().toString()));
        }

        return Response.ok(jsonArrayBuilder.build()).build();
    }
}
