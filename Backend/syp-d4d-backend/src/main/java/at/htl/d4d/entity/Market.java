package at.htl.d4d.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import java.time.LocalDateTime;

@Entity
public class Market extends PanacheEntity {
    @Column
    public Long serviceType_ID;

    @Column
    public Long user_ID;

    @Column
    public int offer;

    @Column
    private LocalDateTime startDate;

    @Column
    private LocalDateTime endDate;

    public Market() {}

    public Market(Long serviceType_ID, Long user_ID, int offer) {
        this.serviceType_ID = serviceType_ID;
        this.user_ID = user_ID;
        this.offer = offer;
        this.startDate = LocalDateTime.now();
        this.endDate = LocalDateTime.of(9999, 12, 31, 23, 59, 59);
    }
}