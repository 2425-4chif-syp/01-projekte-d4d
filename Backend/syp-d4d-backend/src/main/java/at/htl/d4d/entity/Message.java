package at.htl.d4d.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import java.time.LocalDateTime;

@Entity
public class Message extends PanacheEntity {

    @Column(name = "chat_id")
    public Long chatId;

    @Column(name = "user_name")
    public String userName;

    @Column(name = "message")
    public String message;

    @Column(name = "image")
    public String image;

    @Column(name = "created_at")
    public LocalDateTime createdAt = LocalDateTime.now();

    public Message() {
    }

    // Häufig verwendeter Konstruktor
    public Message(Long chatId, String userName, String message, String image) {
        this.chatId = chatId;
        this.userName = userName;
        this.message = message;
        this.image = image;
    }

    // Optionaler Konstruktor, falls du den alten Ansatz mit (id, chatId, userName, …) brauchst
    public Message(Long id, Long chatId, String userName, String message, String image, LocalDateTime createdAt) {
        this.id = id;
        this.chatId = chatId;
        this.userName = userName;
        this.message = message;
        this.image = image;
        this.createdAt = createdAt;
    }

    // Getter, damit dein alter Code (getId(), getChatId() etc.) weiterhin funktioniert
    public Long getId() {
        return this.id;
    }

    public Long getChatId() {
        return this.chatId;
    }

    public String getUserName() {
        return this.userName;
    }

    public String getMessageContent() {
        return this.message;
    }

    public String getImage() {
        return this.image;
    }

    public LocalDateTime getCreatedAt() {
        return this.createdAt;
    }
}
