package at.htl.d4d.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import java.time.LocalDateTime;

@Entity
public class Chat extends PanacheEntity {

    @Column(name = "chat_name")
    public String chatName;

    @Column(name = "created_at")
    public LocalDateTime createdAt = LocalDateTime.now();

    public Chat() {
    }

    // Für schnelles Anlegen eines Chats
    public Chat(String chatName) {
        this.chatName = chatName;
    }

    // Optionaler Konstruktor, falls du irgendwo Chat(id, chatName, createdAt) manuell erstellst
    public Chat(Long id, String chatName, LocalDateTime createdAt) {
        this.id = id;
        this.chatName = chatName;
        this.createdAt = createdAt;
    }

    // Getter, damit dein alter Code (getId(), getChatName() etc.) funktioniert
    public Long getId() {
        return this.id;
    }

    public String getChatName() {
        return this.chatName;
    }

    public LocalDateTime getCreatedAt() {
        return this.createdAt;
    }
}
