package at.htl.d4d.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import java.time.LocalDateTime;

@Entity
public class Chat extends PanacheEntity {

    @Column(name = "chat_name")
    public String chatName; // <-- Reiner String

    @Column(name = "created_at")
    public LocalDateTime createdAt = LocalDateTime.now();

    public Chat() {
    }

    public Chat(String chatName) {
        this.chatName = chatName;
    }
}
