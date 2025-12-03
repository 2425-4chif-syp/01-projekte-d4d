package at.htl.entity;

import jakarta.persistence.*;
import java.sql.Timestamp;

@Entity
@Table(name="d4d_service_request")
public class ServiceRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="sr_id")
    private Long id;

    @ManyToOne
    @JoinColumn(name="sr_sender_id", nullable=false)
    private User sender;

    @ManyToOne
    @JoinColumn(name="sr_receiver_id", nullable=false)
    private User receiver;

    @ManyToOne
    @JoinColumn(name="sr_market_id", nullable=false)
    private Market market;

    @Column(name="sr_created_at", nullable=false)
    private Timestamp createdAt;

    @Column(name="sr_status", nullable=false, length=20)
    private String status; // PENDING, ACCEPTED, REJECTED

    public ServiceRequest() {
        this.createdAt = new Timestamp(System.currentTimeMillis());
        this.status = "PENDING";
    }

    public ServiceRequest(User sender, User receiver, Market market) {
        this();
        this.sender = sender;
        this.receiver = receiver;
        this.market = market;
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

    public Market getMarket() {
        return market;
    }

    public void setMarket(Market market) {
        this.market = market;
    }

    public Timestamp getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Timestamp createdAt) {
        this.createdAt = createdAt;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
