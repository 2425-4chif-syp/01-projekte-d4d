package at.htl.websockets;

import at.htl.entity.ChatEntry;
import at.htl.entity.User;
import at.htl.repository.ChatEntryRepository;
import at.htl.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.websocket.*;
import jakarta.websocket.server.PathParam;
import jakarta.websocket.server.ServerEndpoint;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@ServerEndpoint("/chat/{userId}")
@ApplicationScoped
public class ChatSocket {

    @Inject
    ChatEntryRepository chatEntryRepository;

    @Inject
    UserRepository userRepository;

    @Inject
    ObjectMapper objectMapper;

    Map<Long, Session> sessions = new ConcurrentHashMap<>();

    @OnOpen
    public void onOpen(Session session, @PathParam("userId") Long userId) {
        sessions.put(userId, session);
        System.out.println("User " + userId + " connected");
    }

    @OnClose
    public void onClose(Session session, @PathParam("userId") Long userId) {
        sessions.remove(userId);
        System.out.println("User " + userId + " disconnected");
    }

    @OnError
    public void onError(Session session, @PathParam("userId") Long userId, Throwable throwable) {
        sessions.remove(userId);
        System.err.println("User " + userId + " error: " + throwable.getMessage());
    }

    @OnMessage
    @Transactional
    public void onMessage(String message, @PathParam("userId") Long userId) {
        try {
            // Parse message
            ChatEntry chatEntry = objectMapper.readValue(message, ChatEntry.class);
            
            // Ensure sender is the connected user (security check)
            if (chatEntry.getSender() == null || chatEntry.getSender().getId() == null) {
                // If sender is missing, assume it's the connected user
                User sender = new User();
                sender.setId(userId);
                chatEntry.setSender(sender);
            } else if (!chatEntry.getSender().getId().equals(userId)) {
                // If sender is set but different, force it to be the connected user
                chatEntry.getSender().setId(userId);
            }

            // Fetch full entities to ensure they are attached/exist
            User sender = userRepository.findById(chatEntry.getSender().getId());
            User receiver = userRepository.findById(chatEntry.getReceiver().getId());

            if (sender != null && receiver != null) {
                chatEntry.setSender(sender);
                chatEntry.setReceiver(receiver);
                
                if (chatEntry.getTime() == null) {
                    chatEntry.setTime(Timestamp.from(Instant.now()));
                }

                // Persist
                chatEntryRepository.persist(chatEntry);

                // Send to receiver if online
                Session receiverSession = sessions.get(receiver.getId());
                if (receiverSession != null && receiverSession.isOpen()) {
                    receiverSession.getAsyncRemote().sendText(objectMapper.writeValueAsString(chatEntry));
                }
                
                // Send back to sender (to confirm and display with correct timestamp/ID)
                // Only if the sender didn't just send it (to avoid duplicates if frontend handles optimistic UI)
                // But here we want to confirm persistence.
                // Frontend should handle deduplication or just replace the optimistic one.
                Session senderSession = sessions.get(sender.getId());
                if (senderSession != null && senderSession.isOpen()) {
                    senderSession.getAsyncRemote().sendText(objectMapper.writeValueAsString(chatEntry));
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
