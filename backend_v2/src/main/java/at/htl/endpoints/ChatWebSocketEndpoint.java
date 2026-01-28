package at.htl.endpoints;

import at.htl.entity.ChatEntry;
import at.htl.entity.User;
import at.htl.repository.ChatEntryRepository;
import at.htl.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.websocket.*;
import jakarta.websocket.server.PathParam;
import jakarta.websocket.server.ServerEndpoint;

import java.io.IOException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * WebSocket endpoint for real-time chat messaging.
 * Replaces polling with instant message delivery.
 * 
 * Note: Frontend connects to /ws/chat/{userId}, nginx strips /ws prefix,
 * so backend listens on /chat/{userId}
 */
@ServerEndpoint("/chat/{userId}")
@ApplicationScoped
public class ChatWebSocketEndpoint {

    private static final Logger LOG = Logger.getLogger(ChatWebSocketEndpoint.class.getName());
    
    // Map userId -> Set of sessions (user can have multiple tabs/devices)
    private static final Map<Long, Set<Session>> userSessions = new ConcurrentHashMap<>();
    
    // Map session -> userId for quick lookup on close
    private static final Map<Session, Long> sessionUserMap = new ConcurrentHashMap<>();

    @Inject
    ChatEntryRepository chatEntryRepository;

    @Inject
    UserRepository userRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @OnOpen
    public void onOpen(Session session, @PathParam("userId") Long userId) {
        LOG.info("WebSocket opened for userId: " + userId + ", sessionId: " + session.getId());
        
        // Validate user exists
        User user = userRepository.findById(userId);
        if (user == null) {
            LOG.warning("User not found: " + userId);
            try {
                session.close(new CloseReason(CloseReason.CloseCodes.VIOLATED_POLICY, "User not found"));
            } catch (IOException e) {
                LOG.log(Level.WARNING, "Error closing session", e);
            }
            return;
        }

        // Register session
        userSessions.computeIfAbsent(userId, k -> new CopyOnWriteArraySet<>()).add(session);
        sessionUserMap.put(session, userId);

        // Send welcome message
        try {
            ObjectNode welcomeMsg = objectMapper.createObjectNode();
            welcomeMsg.put("type", "connected");
            welcomeMsg.put("userId", userId);
            welcomeMsg.put("message", "Connected to chat");
            session.getBasicRemote().sendText(objectMapper.writeValueAsString(welcomeMsg));
        } catch (IOException e) {
            LOG.log(Level.WARNING, "Error sending welcome message", e);
        }

        LOG.info("Active users: " + userSessions.keySet().size() + ", Total sessions: " + sessionUserMap.size());
    }

    @OnClose
    public void onClose(Session session, CloseReason closeReason) {
        Long userId = sessionUserMap.remove(session);
        if (userId != null) {
            Set<Session> sessions = userSessions.get(userId);
            if (sessions != null) {
                sessions.remove(session);
                if (sessions.isEmpty()) {
                    userSessions.remove(userId);
                }
            }
            LOG.info("WebSocket closed for userId: " + userId + ", reason: " + closeReason.getReasonPhrase());
        }
        LOG.info("Active users: " + userSessions.keySet().size() + ", Total sessions: " + sessionUserMap.size());
    }

    @OnError
    public void onError(Session session, Throwable throwable) {
        Long userId = sessionUserMap.get(session);
        LOG.log(Level.WARNING, "WebSocket error for userId: " + userId, throwable);
    }

    @OnMessage
    @Transactional
    public void onMessage(Session session, String messageJson) {
        Long senderId = sessionUserMap.get(session);
        if (senderId == null) {
            LOG.warning("Received message from unknown session");
            return;
        }

        LOG.info("Received message from userId " + senderId + ": " + messageJson);

        try {
            JsonNode jsonNode = objectMapper.readTree(messageJson);
            String type = jsonNode.has("type") ? jsonNode.get("type").asText() : "message";

            if ("ping".equals(type)) {
                // Respond to ping with pong
                ObjectNode pongMsg = objectMapper.createObjectNode();
                pongMsg.put("type", "pong");
                session.getBasicRemote().sendText(objectMapper.writeValueAsString(pongMsg));
                return;
            }

            if ("message".equals(type)) {
                handleChatMessage(session, senderId, jsonNode);
            }

        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Error processing message", e);
            sendError(session, "Error processing message: " + e.getMessage());
        }
    }

    private void handleChatMessage(Session session, Long senderId, JsonNode jsonNode) throws IOException {
        Long receiverId = jsonNode.has("receiverId") ? jsonNode.get("receiverId").asLong() : null;
        String messageText = jsonNode.has("message") ? jsonNode.get("message").asText() : null;
        String clientMessageId = jsonNode.has("clientMessageId") ? jsonNode.get("clientMessageId").asText() : null;

        if (receiverId == null || messageText == null || messageText.trim().isEmpty()) {
            sendError(session, "Missing receiverId or message");
            return;
        }

        // Load users
        User sender = userRepository.findById(senderId);
        User receiver = userRepository.findById(receiverId);

        if (sender == null || receiver == null) {
            sendError(session, "Invalid sender or receiver");
            return;
        }

        // Create and persist chat entry
        Timestamp now = Timestamp.from(Instant.now());
        ChatEntry chatEntry = new ChatEntry(sender, receiver, messageText, now);
        chatEntryRepository.persist(chatEntry);

        LOG.info("Message persisted with id: " + chatEntry.getId());

        // Build broadcast message
        ObjectNode broadcastMsg = objectMapper.createObjectNode();
        broadcastMsg.put("type", "message");
        broadcastMsg.put("id", chatEntry.getId());
        
        ObjectNode senderNode = objectMapper.createObjectNode();
        senderNode.put("id", sender.getId());
        senderNode.put("name", sender.getName());
        broadcastMsg.set("sender", senderNode);
        
        ObjectNode receiverNode = objectMapper.createObjectNode();
        receiverNode.put("id", receiver.getId());
        receiverNode.put("name", receiver.getName());
        broadcastMsg.set("receiver", receiverNode);
        
        broadcastMsg.put("message", messageText);
        broadcastMsg.put("time", now.toInstant().toString());
        
        if (clientMessageId != null) {
            broadcastMsg.put("clientMessageId", clientMessageId);
        }

        String broadcastJson = objectMapper.writeValueAsString(broadcastMsg);

        // Send to sender (all their sessions)
        sendToUser(senderId, broadcastJson);

        // Send to receiver (all their sessions)
        sendToUser(receiverId, broadcastJson);

        LOG.info("Message broadcast to sender " + senderId + " and receiver " + receiverId);
    }

    private void sendToUser(Long userId, String message) {
        Set<Session> sessions = userSessions.get(userId);
        if (sessions != null) {
            for (Session s : sessions) {
                if (s.isOpen()) {
                    try {
                        s.getBasicRemote().sendText(message);
                    } catch (IOException e) {
                        LOG.log(Level.WARNING, "Error sending to session " + s.getId(), e);
                    }
                }
            }
        }
    }

    private void sendError(Session session, String errorMessage) {
        try {
            ObjectNode errorMsg = objectMapper.createObjectNode();
            errorMsg.put("type", "error");
            errorMsg.put("message", errorMessage);
            session.getBasicRemote().sendText(objectMapper.writeValueAsString(errorMsg));
        } catch (IOException e) {
            LOG.log(Level.WARNING, "Error sending error message", e);
        }
    }
}
