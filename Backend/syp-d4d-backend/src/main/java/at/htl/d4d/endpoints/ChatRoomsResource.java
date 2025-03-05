package at.htl.d4d.endpoints;

import at.htl.d4d.control.ChatRepository;
import at.htl.d4d.entity.Chat;
import jakarta.inject.Inject;
import jakarta.json.Json;
import jakarta.json.JsonArrayBuilder;
import jakarta.json.JsonObject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;

@Path("/chat/rooms")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ChatRoomsResource {

    @Inject
    ChatRepository chatRepository;


    @POST
    @Transactional
    public Response createChat(JsonObject chatJson) {
        String chatName = chatJson.getString("chatName", "").trim();
        if (chatName.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Json.createObjectBuilder()
                            .add("error", "Chat name must not be empty")
                            .build())
                    .build();
        }

        // Neues Chat-Objekt anlegen und speichern
        Chat chat = new Chat(chatName);
        chatRepository.persist(chat);

        return Response.status(Response.Status.CREATED)
                .entity(Json.createObjectBuilder()
                        .add("chatName", chat.getChatName())
                        .build())
                .build();
    }

    @GET
    public Response getChats() {
        List<Chat> chats = chatRepository.listAll();

        JsonArrayBuilder jsonArrayBuilder = Json.createArrayBuilder();
        for (Chat chat : chats) {
            jsonArrayBuilder.add(Json.createObjectBuilder()
                    .add("id", chat.getId())
                    .add("chatName", chat.getChatName())
                    .add("createdAt", chat.getCreatedAt().toString()));
        }
        return Response.ok(jsonArrayBuilder.build()).build();
    }
}
