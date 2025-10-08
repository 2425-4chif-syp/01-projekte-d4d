package at.htl.endpoints;

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
import java.util.List;

@Path("chatentry")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ChatEntryResource {
    @Inject
    ChatEntryRepository chatEntryRepository;
    
    @Inject
    UserRepository userRepository;

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