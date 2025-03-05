package at.htl.d4d.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import java.time.LocalDateTime;

@Entity
public class Message extends PanacheEntity {

    // Verweist auf den zugehörigen Chat
    @Column(name = "chat_id")
    public Long chatId;

    // Sender der Nachricht (kann bei fortlaufendem Chat variieren)
    @Column(name = "sender_id")
    public Long senderId;

    // Inhalt der Nachricht
    @Column(name = "message")
    public String message;

    // Zeitstempel, wann die Nachricht gesendet wurde
    @Column(name = "time")
    public LocalDateTime time = LocalDateTime.now();

    public Message() {}

    public Message(Long chatId, Long senderId, String message) {
        this.chatId = chatId;
        this.senderId = senderId;
        this.message = message;
    }
}
