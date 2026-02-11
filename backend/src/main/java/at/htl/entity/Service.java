package at.htl.entity;

import jakarta.persistence.*;
import java.sql.Timestamp;

@Entity
@Table(name="d4d_service")
public class Service {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="s_id")
    private Long id;

    @ManyToOne
    @JoinColumn(name="s_m_provider_id")
    private Market marketProvider;

    @ManyToOne
    @JoinColumn(name="s_m_client_id")
    private Market marketClient;

    @Column(name="s_status", length=20)
    private String status; // ACTIVE, PENDING_COMPLETION, COMPLETED, CANCELLED

    @Column(name="s_provider_confirmed")
    private Boolean providerConfirmed = false;

    @Column(name="s_client_confirmed")
    private Boolean clientConfirmed = false;

    @Column(name="s_created_at")
    private Timestamp createdAt;

    @Column(name="s_completed_at")
    private Timestamp completedAt;

    public Service() {
        this.createdAt = new Timestamp(System.currentTimeMillis());
        this.status = "ACTIVE";
    }

    public Service(Market marketProvider, Market marketClient) {
        this();
        this.marketProvider = marketProvider;
        this.marketClient = marketClient;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Market getMarketProvider() {
        return marketProvider;
    }

    public void setMarketProvider(Market marketProvider) {
        this.marketProvider = marketProvider;
    }

    public Market getMarketClient() {
        return marketClient;
    }

    public void setMarketClient(Market marketClient) {
        this.marketClient = marketClient;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Timestamp getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Timestamp createdAt) {
        this.createdAt = createdAt;
    }

    public Timestamp getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(Timestamp completedAt) {
        this.completedAt = completedAt;
    }

    public Boolean getProviderConfirmed() {
        return providerConfirmed;
    }

    public void setProviderConfirmed(Boolean providerConfirmed) {
        this.providerConfirmed = providerConfirmed;
    }

    public Boolean getClientConfirmed() {
        return clientConfirmed;
    }

    public void setClientConfirmed(Boolean clientConfirmed) {
        this.clientConfirmed = clientConfirmed;
    }
}
