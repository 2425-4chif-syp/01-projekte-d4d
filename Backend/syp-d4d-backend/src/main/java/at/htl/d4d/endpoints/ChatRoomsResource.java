package at.htl.d4d.endpoints;

import at.htl.d4d.control.ChatRepository;
import at.htl.d4d.entity.Chat;
import jakarta.inject.Inject;
import jakarta.json.Json;
import jakarta.json.JsonArrayBuilder;
import jakarta.json.JsonObject;
import jakarta.json.JsonObjectBuilder;
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

    @GET
    public Response getChats() {
        List<Chat> chats = chatRepository.listAll();
        JsonArrayBuilder arrayBuilder = Json.createArrayBuilder();

        for (Chat chat : chats) {
            // Hier wird chatName direkt als String eingefügt:
            JsonObjectBuilder obj = Json.createObjectBuilder()
                    .add("id", chat.id)
                    .add("chatName", chat.chatName != null ? chat.chatName : "")
                    .add("createdAt", chat.createdAt.toString());
            arrayBuilder.add(obj);
        }
        return Response.ok(arrayBuilder.build()).build();
    }

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

        // Neuer Chat mit normalem String
        Chat chat = new Chat(chatName);
        chatRepository.persist(chat);

        JsonObject response = Json.createObjectBuilder()
                .add("id", chat.id)
                .add("chatName", chat.chatName)
                .add("createdAt", chat.createdAt.toString())
                .build();

        return Response.status(Response.Status.CREATED).entity(response).build();
    }
}
