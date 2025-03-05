package at.htl.d4d.endpoints;

import at.htl.d4d.control.MessageRepository;
import at.htl.d4d.entity.Message;
import jakarta.inject.Inject;
import jakarta.json.Json;
import jakarta.json.JsonArrayBuilder;
import jakarta.json.JsonObject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;

@Path("/chat/rooms/{chatId}/messages")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ChatMessageResource {

    @PathParam("chatId")
    Long chatId;

    @Inject
    MessageRepository messageRepository;

    @GET
    public Response getMessages() {
        List<Message> messages = messageRepository.getMessagesByChat(chatId);

        JsonArrayBuilder arr = Json.createArrayBuilder();
        for (Message m : messages) {
            arr.add(Json.createObjectBuilder()
                    .add("id", m.getId())
                    .add("chatId", m.getChatId())
                    .add("user", m.getUserName())
                    .add("message", m.getMessageContent() != null ? m.getMessageContent() : "")
                    .add("image", m.getImage() != null ? m.getImage() : "")
                    .add("createdAt", m.getCreatedAt().toString())
            );
        }
        return Response.ok(arr.build()).build();
    }

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

        JsonObject response = Json.createObjectBuilder()
                .add("status", "created")
                .add("chatId", chatId)
                .add("user", user)
                .add("message", messageContent)
                .add("image", image != null ? image : "")
                .build();

        return Response.status(Response.Status.CREATED).entity(response).build();
    }
}
