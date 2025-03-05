package at.htl.d4d.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import java.time.LocalDateTime;

@Entity
public class Chat extends PanacheEntity {

    // Entsprechend ERD: Der Chat wird durch eine Sender- und eine Empfänger-ID definiert.
    @Column(name = "sender_id")
    public Long senderId;

    @Column(name = "receiver_id")
    public Long receiverId;

    // Zeitpunkt der Chat-Erstellung
    @Column(name = "created_at")
    public LocalDateTime createdAt = LocalDateTime.now();

    public Chat() {}

    public Chat(Long senderId, Long receiverId) {
        this.senderId = senderId;
        this.receiverId = receiverId;
    }
}
