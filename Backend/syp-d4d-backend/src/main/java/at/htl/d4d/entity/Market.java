package at.htl.d4d.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;

@Entity
public class Market extends PanacheEntity {
    @Column
    public Long market_ID;

    @Column
    public Long serviceType_ID;

    @Column
    public Long user_ID;

    @Column
    public int offer;
}