package at.htl.d4d.entity;

import java.time.LocalDateTime;

public class Chat {
    private int id;
    private String chatName;
    private LocalDateTime createdAt;

    public Chat(int id, String chatName, LocalDateTime createdAt) {
        this.id = id;
        this.chatName = chatName;
        this.createdAt = createdAt;
    }

    public int getId() {
        return id;
    }

    public String getChatName() {
        return chatName;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
