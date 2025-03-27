package at.htl.d4d.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import java.sql.Timestamp;

@Entity
public class ChatEntry extends PanacheEntity {
    @Column
    private Long sender_ID;

    @Column
    private Long receiver_ID;

    @Column
    private String message;

    @Column
    private Timestamp time;

    public ChatEntry() {
    }

    public ChatEntry(Long sender_ID, Long receiver_ID, String message, Timestamp time) {
        this.sender_ID = sender_ID;
        this.receiver_ID = receiver_ID;
        this.message = message;
        this.time = time;
    }

    public Long getSender_ID() {
        return sender_ID;
    }

    public void setSender_ID(Long sender_ID) {
        this.sender_ID = sender_ID;
    }

    public Long getReceiver_ID() {
        return receiver_ID;
    }

    public void setReceiver_ID(Long receiver_ID) {
        this.receiver_ID = receiver_ID;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Timestamp getTime() {
        return time;
    }

    public void setTime(Timestamp time) {
        this.time = time;
    }
}
