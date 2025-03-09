package at.htl.d4d.entity;

import at.htl.d4d.encryption.EncryptionConverter;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
public class Message extends PanacheEntity {

    @Column(name = "chat_id")
    public Long chatId;

    @Column(name = "user_name")
    public String userName;

    @Convert(converter = EncryptionConverter.class)  // <-- Verschlüsselung aktiv
    @Column(name = "message")
    public String message;

    @Convert(converter = EncryptionConverter.class)  // <-- Verschlüsselung aktiv
    @Column(name = "image")
    public String image;

    @Column(name = "created_at")
    public LocalDateTime createdAt = LocalDateTime.now();

    public Message() {
    }

    public Message(Long chatId, String userName, String message, String image) {
        this.chatId = chatId;
        this.userName = userName;
        this.message = message;
        this.image = image;
    }

    // Getter usw.

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
