package at.htl.d4d.entity;

import java.time.LocalDateTime;

public class Message {
    private int id;
    private int chatId;
    private String userName;
    private String message;
    private String image; // Neues Feld für Bilddaten
    private LocalDateTime createdAt;

    public Message(int id, int chatId, String userName, String message, String image, LocalDateTime createdAt) {
        this.id = id;
        this.chatId = chatId;
        this.userName = userName;
        this.message = message;
        this.image = image;
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

    public String getImage() {
        return image;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
