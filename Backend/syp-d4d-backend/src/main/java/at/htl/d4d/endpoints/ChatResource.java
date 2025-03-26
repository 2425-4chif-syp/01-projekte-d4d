package at.htl.d4d.endpoints;

import at.htl.d4d.control.ChatRepository;
import at.htl.d4d.control.UserRepository;
import at.htl.d4d.entity.ChatEntry;
import at.htl.d4d.entity.User;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.sql.Timestamp;
import java.util.*;

@Path("/chat")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ChatResource {

    @Inject
    ChatRepository chatRepository;

    @Inject
    UserRepository userRepository;

    private final Long CURRENT_USER_ID = 1L; // "Eingeloggter" Nutzer
    private final Long ADMIN_ID = 0L;       // Admin

    @GET
    @Path("/contacts")
    public Response getAllContacts() {
        // Alle ChatEntry-Einträge laden
        List<ChatEntry> entries = chatRepository.listAll();

        // In diesem Set sammeln wir alle beteiligten User-IDs
        Set<Long> userIds = new LinkedHashSet<>();
        for (ChatEntry entry : entries) {
            userIds.add(entry.getSender_ID());
            userIds.add(entry.getReceiver_ID());
        }

        // Für jede User-ID das zugehörige User-Objekt finden
        List<User> contacts = new ArrayList<>();
        for (Long uid : userIds) {
            // Admin-ID 0 überspringen (falls du sie nicht anzeigen möchtest)
            if (uid == ADMIN_ID) {
                continue;
            }
            User u = userRepository.findById(uid);
            if (u == null) {
                // Falls kein User-Objekt existiert, Dummy erzeugen
                u = new User();
                u.id = uid;
                u.name = "Unbekannt (" + uid + ")";
            }
            contacts.add(u);
        }

        return Response.ok(contacts).build();
    }

    @GET
    @Path("/{partnerId}/messages")
    public Response getMessages(@PathParam("partnerId") Long partnerId) {
        List<ChatEntry> messages = chatRepository.getMessagesBetween(CURRENT_USER_ID, partnerId);
        // Wenn keine Nachrichten gefunden, geben wir eine leere Liste zurück
        if (messages == null || messages.isEmpty()) {
            return Response.ok(Collections.emptyList()).build();
        }
        return Response.ok(messages).build();
    }

    @POST
    @Path("/{partnerId}/messages")
    @Transactional
    public Response sendMessage(@PathParam("partnerId") Long partnerId, ChatEntry incoming) {
        // incoming enthält nur das Feld 'message' (und evtl. weitere)
        if (incoming.getMessage() == null || incoming.getMessage().trim().isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Nachricht darf nicht leer sein")
                    .build();
        }

        ChatEntry chatEntry = new ChatEntry();
        chatEntry.setSender_ID(CURRENT_USER_ID);
        chatEntry.setReceiver_ID(partnerId);
        chatEntry.setMessage(incoming.getMessage());
        chatEntry.setTime(new Timestamp(System.currentTimeMillis()));

        // Hier brauchen wir eine laufende Transaktion:
        chatRepository.persist(chatEntry);

        return Response.status(Response.Status.CREATED).entity(chatEntry).build();
    }
}
