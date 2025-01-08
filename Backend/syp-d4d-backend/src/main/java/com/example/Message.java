package com.example;

import java.time.LocalDateTime;

public class Message {
    private String userName;
    private String message;
    private LocalDateTime createdAt;

    public Message(String userName, String message, LocalDateTime createdAt) {
        this.userName = userName;
        this.message = message;
        this.createdAt = createdAt;
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
