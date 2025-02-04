package com.example;

import java.time.LocalDateTime;

public class Chat {
    private String chatName;
    private LocalDateTime createdAt;

    public Chat(String chatName, LocalDateTime createdAt) {
        this.chatName = chatName;
        this.createdAt = createdAt;
    }

    public String getChatName() {
        return chatName;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
