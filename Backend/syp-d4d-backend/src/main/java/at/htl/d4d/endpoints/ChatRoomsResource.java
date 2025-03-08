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

import java.util.ArrayList;
import java.util.List;

@Path("/chat/rooms")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ChatRoomsResource {

    @Inject
    ChatRepository chatRepository;

    // GET /chat/rooms
    @GET
    public Response getChats() {
        List<Chat> chats = chatRepository.listAll();

        // Falls keine Chats existieren, analog zu MarketResource 404 liefern
        if (chats.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        // Baue eine DTO-Liste (ähnlich wie in MarketResource)
        List<ChatDto> dtos = new ArrayList<>();
        for (Chat chat : chats) {
            // Wenn chat.chatName leer oder "Standardchat" ist, ersetze es durch etwas Sinnvolles
            String displayedName = chat.chatName;
            if (displayedName == null || displayedName.trim().isEmpty()
                    || "Standardchat".equalsIgnoreCase(displayedName)) {
                displayedName = "Unbekannter Chatpartner";
            }

            dtos.add(new ChatDto(
                    chat.id,
                    displayedName,
                    chat.createdAt != null ? chat.createdAt.toString() : ""
            ));
        }

        return Response.ok(dtos).build();
    }

    // POST /chat/rooms
    @POST
    @Transactional
    public Response createChat(JsonObject chatJson) {
        String chatName = chatJson.getString("chatName", "").trim();
        if (chatName.isEmpty()) {
            // Fehlermeldung, falls kein Name mitgegeben wurde
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Chat name must not be empty")
                    .build();
        }

        // Neuen Chat anlegen
        Chat chat = new Chat(chatName);
        chatRepository.persist(chat);

        // Wie in MarketResource: nur "Successfully" zurückgeben
        return Response.ok("Successfully").build();
    }

    // Einfaches DTO, ähnlich wie MarketDto
    public static class ChatDto {
        public Long id;
        public String chatName;
        public String createdAt;

        public ChatDto(Long id, String chatName, String createdAt) {
            this.id = id;
            this.chatName = chatName;
            this.createdAt = createdAt;
        }
    }
}
