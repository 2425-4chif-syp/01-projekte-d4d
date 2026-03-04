package at.htl.websockets;

import at.htl.entity.ChatEntry;
import at.htl.entity.User;
import at.htl.repository.ChatEntryRepository;
import at.htl.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
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

    public Map<Long, Session> sessions = new ConcurrentHashMap<>();

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
            // Ignore heartbeat/ping messages from the client
            if (message.contains("\"type\"") && message.contains("\"ping\"")) {
                return;
            }

            // Parse JSON manually to avoid java.sql.Timestamp deserialization issues
            JsonNode node = objectMapper.readTree(message);

            long senderId = node.path("sender").path("id").asLong(userId);
            long receiverId = node.path("receiver").path("id").asLong(0);
            String msgText = node.path("message").asText("");

            if (receiverId == 0 || msgText.isEmpty()) {
                System.err.println("Invalid message from user " + userId + ": missing receiver or message");
                return;
            }

            // Security: force sender to be the connected user
            if (senderId != userId) {
                senderId = userId;
            }

            User sender = userRepository.findById(senderId);
            User receiver = userRepository.findById(receiverId);

            if (sender != null && receiver != null) {
                ChatEntry chatEntry = new ChatEntry(sender, receiver, msgText, Timestamp.from(Instant.now()));
                chatEntryRepository.persist(chatEntry);

                String json = objectMapper.writeValueAsString(chatEntry);

                // Send to receiver if online
                Session receiverSession = sessions.get(receiver.getId());
                if (receiverSession != null && receiverSession.isOpen()) {
                    receiverSession.getAsyncRemote().sendText(json);
                }

                // Send echo to sender (confirms persistence with real ID/timestamp)
                Session senderSession = sessions.get(sender.getId());
                if (senderSession != null && senderSession.isOpen()) {
                    senderSession.getAsyncRemote().sendText(json);
                }
            } else {
                System.err.println("User not found: sender=" + senderId + " receiver=" + receiverId);
            }

        } catch (Exception e) {
            System.err.println("Error processing message from user " + userId + ": " + e.getMessage());
            e.printStackTrace();
        }
    }
}
