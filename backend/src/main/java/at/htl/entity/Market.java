package at.htl.entity;

import jakarta.persistence.*;

@Entity
@Table(name="d4d_market")
public class Market {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="m_id")
    private Long id;

    @Column(name="m_offer")
    private int offer;

    @ManyToOne
    @JoinColumn(name="m_st_id")
    private ServiceType serviceType;

    @ManyToOne
    @JoinColumn(name="m_u_id")
    private User user;

    public Market() {

    }

    public Market(int offer, ServiceType serviceType, User user) {
        this.offer = offer;
        this.serviceType = serviceType;
        this.user = user;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public int getOffer() {
        return offer;
    }

    public void setOffer(int offer) {
        this.offer = offer;
    }

    public ServiceType getServiceType() {
        return serviceType;
    }

    public void setServiceType(ServiceType serviceType) {
        this.serviceType = serviceType;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }
}
