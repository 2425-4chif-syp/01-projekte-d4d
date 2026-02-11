package at.htl.entity;

import jakarta.persistence.*;

import java.sql.Timestamp;

@Entity
@Table(name="d4d_chat_entry")
public class ChatEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="ce_id")
    private Long id;

    @ManyToOne
    @JoinColumn(name="ce_u_sender_id")
    private User sender;

    @ManyToOne
    @JoinColumn(name="ce_u_receiver_id")
    private User receiver;

    @Column(name="ce_message")
    private String message;

    @Column(name="ce_time")
    private Timestamp time;

    public ChatEntry() {

    }

    public ChatEntry(User sender, User receiver, String message, Timestamp time) {
        this.sender = sender;
        this.receiver = receiver;
        this.message = message;
        this.time = time;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getSender() {
        return sender;
    }

    public void setSender(User sender) {
        this.sender = sender;
    }

    public User getReceiver() {
        return receiver;
    }

    public void setReceiver(User receiver) {
        this.receiver = receiver;
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
