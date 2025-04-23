package at.htl.entity;

import jakarta.persistence.*;

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

    /*
    @ManyToOne
    @JoinColumn(name="s_s_id")
    private Service service;*/

    public Service() {

    }

    public Service(Market marketProvider, Market marketClient) {
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
}
