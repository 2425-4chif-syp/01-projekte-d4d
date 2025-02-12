package at.htl.d4d.entity;

import java.time.LocalDateTime;

public class Message {
    private int id;
    private int chatId;
    private String userName;
    private String message;
    private LocalDateTime createdAt;

    public Message(int id, int chatId, String userName, String message, LocalDateTime createdAt) {
        this.id = id;
        this.chatId = chatId;
        this.userName = userName;
        this.message = message;
        this.createdAt = createdAt;
    }

    public int getId() {
        return id;
    }

    public int getChatId() {
        return chatId;
    }

    public String getUserName() {
        return userName;
    }

    public String getMessage() {
        return message;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
