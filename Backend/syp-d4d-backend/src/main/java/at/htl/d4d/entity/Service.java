package at.htl.d4d.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;

@Entity
public class Service extends PanacheEntity {
    @Column
    private Long marketProvider_ID;

    @Column
    private Long marketClient_ID;

    public Long getMarketProvider_ID() {
        return marketProvider_ID;
    }

    public void setMarketProvider_ID(Long marketProvider_ID) {
        this.marketProvider_ID = marketProvider_ID;
    }

    public Long getMarketClient_ID() {
        return marketClient_ID;
    }

    public void setMarketClient_ID(Long marketClient_ID) {
        this.marketClient_ID = marketClient_ID;
    }

    public Service() {

    }

    public Service(Long marketProvider_ID, Long marketClient_ID) {
        this.marketProvider_ID = marketProvider_ID;
        this.marketClient_ID = marketClient_ID;
    }
}
