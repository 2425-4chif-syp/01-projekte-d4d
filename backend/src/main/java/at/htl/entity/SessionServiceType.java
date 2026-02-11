package at.htl.entity;

import jakarta.persistence.*;

@Entity
@Table(name="d4d_session_service_type")
public class SessionServiceType {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="sst_id")
    private Long id;

    @ManyToOne
    @JoinColumn(name="sst_sess_id")
    private Session session;

    @ManyToOne
    @JoinColumn(name="sst_st_id")
    private ServiceType serviceType;

    @Column(name="sst_is_offer")
    private boolean isOffer;

    public SessionServiceType() {
    }

    public SessionServiceType(Session session, ServiceType serviceType, boolean isOffer) {
        this.session = session;
        this.serviceType = serviceType;
        this.isOffer = isOffer;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Session getSession() {
        return session;
    }

    public void setSession(Session session) {
        this.session = session;
    }

    public ServiceType getServiceType() {
        return serviceType;
    }

    public void setServiceType(ServiceType serviceType) {
        this.serviceType = serviceType;
    }

    public boolean isOffer() {
        return isOffer;
    }

    public void setOffer(boolean offer) {
        isOffer = offer;
    }
}
