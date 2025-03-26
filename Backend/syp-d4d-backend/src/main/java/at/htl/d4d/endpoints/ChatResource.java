package at.htl.d4d.endpoints;

import at.htl.d4d.control.ChatRepository;
import at.htl.d4d.control.UserRepository;
import at.htl.d4d.entity.ChatEntry;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.sql.Timestamp;
import java.util.Collections;
import java.util.List;

@Path("/chat")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ChatResource {

    @Inject
    ChatRepository chatRepository;

    @Inject
    UserRepository userRepository;

    // Wir entfernen die feste CURRENT_USER_ID!

    /**
     * Gibt alle Kontakte (User) zurück, die in der ChatEntry-Tabelle vorkommen.
     */
    @GET
    @Path("/contacts")
    public Response getAllContacts() {
        // Alle ChatEntries holen und die beteiligten User-IDs einsammeln
        var entries = chatRepository.listAll();
        var userIds = entries.stream()
                .flatMap(e -> List.of(e.getSender_ID(), e.getReceiver_ID()).stream())
                .distinct()
                .toList();

        // Für jede ID den User suchen (oder Dummy anlegen)
        var contacts = userIds.stream().map(uid -> {
            var user = userRepository.findById(uid);
            if (user == null) {
                // Dummy-Fall
                var dummy = new at.htl.d4d.entity.User();
                dummy.id = uid;
                dummy.name = "Unbekannt (" + uid + ")";
                return dummy;
            }
            return user;
        }).toList();

        return Response.ok(contacts).build();
    }

    /**
     * Holt alle Nachrichten zwischen `currentUserId` und `partnerId`.
     * Die aktuelle User-ID kommt per Query-Parameter, z. B. /chat/2/messages?currentUserId=1
     */
    @GET
    @Path("/{partnerId}/messages")
    public Response getMessages(
            @PathParam("partnerId") Long partnerId,
            @QueryParam("currentUserId") Long currentUserId
    ) {
        if (currentUserId == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Fehlender Parameter: currentUserId")
                    .build();
        }
        var messages = chatRepository.getMessagesBetween(currentUserId, partnerId);
        if (messages.isEmpty()) {
            return Response.ok(Collections.emptyList()).build();
        }
        return Response.ok(messages).build();
    }

    /**
     * Sendet eine Nachricht von `incoming.sender_ID` an `partnerId`.
     * Beispiel: POST /chat/2/messages  mit JSON { "sender_ID": 1, "message": "Hallo" }
     */
    @POST
    @Path("/{partnerId}/messages")
    @Transactional
    public Response sendMessage(@PathParam("partnerId") Long partnerId, ChatEntry incoming) {
        if (incoming.getSender_ID() == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("sender_ID darf nicht null sein")
                    .build();
        }
        if (incoming.getMessage() == null || incoming.getMessage().trim().isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Nachricht darf nicht leer sein")
                    .build();
        }

        ChatEntry chatEntry = new ChatEntry();
        chatEntry.setSender_ID(incoming.getSender_ID());
        chatEntry.setReceiver_ID(partnerId);
        chatEntry.setMessage(incoming.getMessage());
        chatEntry.setTime(new Timestamp(System.currentTimeMillis()));

        chatRepository.persist(chatEntry);
        return Response.status(Response.Status.CREATED).entity(chatEntry).build();
    }
}
