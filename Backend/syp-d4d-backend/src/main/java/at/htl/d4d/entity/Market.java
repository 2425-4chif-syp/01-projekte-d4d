package at.htl.d4d.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;

@Entity
public class Market extends PanacheEntity {
    @Column
    public Long serviceType_ID;

    @Column
    public Long user_ID;

    @Column
    public int offer;

    public Market() {}

    public Market(Long serviceType_ID, Long user_ID, int offer) {
        this.serviceType_ID = serviceType_ID;
        this.user_ID = user_ID;
        this.offer = offer;
    }
}