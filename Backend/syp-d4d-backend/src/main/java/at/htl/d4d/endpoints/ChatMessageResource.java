package at.htl.d4d.endpoints;

import at.htl.d4d.control.MessageRepository;
import at.htl.d4d.entity.Message;
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
        List<Message> messages = MessageRepository.getMessagesByChat(chatId);

        JsonArrayBuilder arr = Json.createArrayBuilder();
        for (Message m : messages) {
            arr.add(Json.createObjectBuilder()
                    .add("id", m.getId())
                    .add("chatId", m.getChatId())
                    .add("user", m.getUserName())
                    .add("message", m.getMessage() != null ? m.getMessage() : "")
                    .add("image", m.getImage() != null ? m.getImage() : "")
                    .add("createdAt", m.getCreatedAt().toString())
            );
        }
        return Response.ok(arr.build()).build();
    }

    @POST
    public Response createMessage(JsonObject messageJson) {
        String user = messageJson.getString("user", "");
        String message = messageJson.getString("message", "");
        String image = messageJson.containsKey("image") ? messageJson.getString("image") : null;

        System.out.println("Received message for chatId " + chatId + ": "
                + user + " - " + message + " / image: " + image);

        // Speichere die Nachricht inkl. Bild in der DB
        MessageRepository.saveMessage(chatId, user, message, image);

        JsonObject response = Json.createObjectBuilder()
                .add("status", "created")
                .add("chatId", chatId)
                .add("user", user)
                .add("message", message)
                .add("image", image != null ? image : "")
                .build();
        return Response.status(Response.Status.CREATED).entity(response).build();
    }
}
