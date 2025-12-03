package at.htl.endpoints;

import at.htl.endpoints.dto.ChatOverviewDto;
import at.htl.entity.ChatEntry;
import at.htl.entity.ServiceType;
import at.htl.entity.User;
import at.htl.repository.ChatEntryRepository;
import at.htl.repository.UserRepository;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Path("chatentry")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ChatEntryResource {
    @Inject
    ChatEntryRepository chatEntryRepository;
    
    @Inject
    UserRepository userRepository;

    @GET
    @Path("/overview/{userId}")
    @Transactional
    public Response getChatOverview(@PathParam("userId") Long userId) {
        List<User> allUsers = userRepository.listAll();
        List<ChatOverviewDto> overview = new ArrayList<>();

        // Fetch all messages involving this user
        List<ChatEntry> allMessages = chatEntryRepository.list(
            "(sender.id = ?1 OR receiver.id = ?1) ORDER BY time ASC", 
            userId
        );

        Map<Long, ChatEntry> lastMessages = new HashMap<>();
        
        for (ChatEntry msg : allMessages) {
            Long partnerId = msg.getSender().getId().equals(userId) ? msg.getReceiver().getId() : msg.getSender().getId();
            lastMessages.put(partnerId, msg);
        }

        for (User user : allUsers) {
            if (user.getId().equals(userId)) continue;

            ChatEntry lastMsg = lastMessages.get(user.getId());
            if (lastMsg != null) {
                overview.add(new ChatOverviewDto(
                    user.getId(),
                    user.getName(), // Assuming getName() exists, otherwise use username
                    lastMsg.getMessage(),
                    lastMsg.getTime(),
                    0 // Unread count logic can be added later if needed
                ));
            } else {
                // Include users with no chat history as well? 
                // Frontend logic separated active/inactive. 
                // Let's return them with null values to let frontend handle it, or just omit them?
                // The frontend expects a list of contacts.
                // Let's return all users, but those without messages have null fields.
                 overview.add(new ChatOverviewDto(
                    user.getId(),
                    user.getName(),
                    null,
                    null,
                    0
                ));
            }
        }
        
        // Sort: Users with messages first (sorted by time desc), then others
        overview.sort((a, b) -> {
            if (a.timestamp != null && b.timestamp != null) {
                return b.timestamp.compareTo(a.timestamp);
            }
            if (a.timestamp != null) return -1;
            if (b.timestamp != null) return 1;
            return 0;
        });

        return Response.ok(overview).build();
    }

    @GET
    @Path("/users")
    @Transactional
    public Response getAllUsers() {
        // Gibt ALLE Benutzer aus der Datenbank zurück, nicht nur die mit Chat-Einträgen
        List<User> users = userRepository.listAll();
        
        if (users.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Keine Benutzer gefunden!").build();
        }
        return Response.ok(users).build();
    }

    @GET
    @Path("/{u_id1}/{u_id2}")
    @Transactional
    public Response getMessages(
            @PathParam("u_id1") Long u_id1,
            @PathParam("u_id2") Long u_id2
    ) {

        List<ChatEntry> chatEntries = chatEntryRepository.list("""
        ((sender.id = ?1 AND receiver.id = ?2)
          OR (sender.id = ?2 AND receiver.id = ?1))
        ORDER BY time ASC
        """, u_id1, u_id2);

        if (chatEntries.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Keine Nachrichten zwischen den beiden Benutzern gefunden!").build();
        }
        return Response.ok(chatEntries).build();
    }

    @POST
    @Transactional
    public Response addChatEntry(ChatEntry chatEntry) {
        chatEntryRepository.persist(chatEntry);
        return Response.status(Response.Status.CREATED).entity(chatEntry).build();
    }
}