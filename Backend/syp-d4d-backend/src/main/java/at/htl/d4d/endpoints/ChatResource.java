package at.htl.d4d.endpoints;

import at.htl.d4d.control.MessageRepository;
import at.htl.d4d.entity.Message;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Path("/chat/default/messages")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ChatResource {

    @Inject
    MessageRepository messageRepository;

    @GET
    public Response getMessages() {
        Long defaultChatId = 1L;
        List<Message> messages = messageRepository.getMessagesByChat(defaultChatId);

        if (messages.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        List<ChatMessageResource.MessageDto> dtos = new ArrayList<>();
        for (Message m : messages) {
            dtos.add(new ChatMessageResource.MessageDto(
                    m.getId(),
                    m.getChatId(),
                    m.getUserName(),
                    (m.getMessageContent() != null ? m.getMessageContent() : ""),
                    (m.getImage() != null ? m.getImage() : ""),
                    m.getCreatedAt()
            ));
        }
        return Response.ok(dtos).build();
    }
}
