package at.htl.d4d.endpoints;

import at.htl.d4d.control.MessageRepository;
import at.htl.d4d.entity.Message;
import jakarta.inject.Inject;
import jakarta.json.JsonObject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Path("/chat/rooms/{chatId}/messages")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ChatMessageResource {

    @PathParam("chatId")
    Long chatId;

    @Inject
    MessageRepository messageRepository;

    // GET /chat/rooms/{chatId}/messages
    @GET
    public Response getMessages() {
        List<Message> messages = messageRepository.getMessagesByChat(chatId);

        // Immer ein Array zurückgeben, auch wenn es leer ist:
        List<MessageDto> dtos = new ArrayList<>();
        for (Message m : messages) {
            dtos.add(new MessageDto(
                    m.getId(),
                    m.getChatId(),
                    m.getUserName(),
                    (m.getMessageContent() != null ? m.getMessageContent() : ""),
                    (m.getImage() != null ? m.getImage() : ""),
                    m.getCreatedAt()
            ));
        }

        // 200 OK, egal ob Nachrichten vorhanden sind oder nicht
        return Response.ok(dtos).build();
    }

    // POST /chat/rooms/{chatId}/messages
    @POST
    @Transactional
    public Response createMessage(JsonObject messageJson) {
        String user = messageJson.getString("user", "");
        String messageContent = messageJson.getString("message", "");
        String image = messageJson.containsKey("image") ? messageJson.getString("image") : null;

        System.out.println("Received message for chatId " + chatId + ": "
                + user + " - " + messageContent + " / image: " + image);

        // Neues Message-Objekt anlegen und speichern
        Message msg = new Message(chatId, user, messageContent, image);
        messageRepository.persist(msg);

        // Analog zu MarketResource nur "Successfully" zurückgeben
        return Response.ok("Successfully").build();
    }

    // Inneres DTO für GET /chat/rooms/{chatId}/messages
    public static class MessageDto {
        public Long id;
        public Long chatId;
        public String user;
        public String message;
        public String image;
        public LocalDateTime createdAt;

        public MessageDto(Long id, Long chatId, String user,
                          String message, String image, LocalDateTime createdAt) {
            this.id = id;
            this.chatId = chatId;
            this.user = user;
            this.message = message;
            this.image = image;
            this.createdAt = createdAt;
        }
    }
}
