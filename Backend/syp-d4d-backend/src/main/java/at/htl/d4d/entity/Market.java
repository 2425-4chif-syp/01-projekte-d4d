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

    @Column(name = "start_date")
    private LocalDateTime startDate = LocalDateTime.now();

    @Column(name = "end_date")
    private LocalDateTime endDate = LocalDateTime.of(9999, 12, 31, 23, 59, 59);

    public Market() {}

    public Market(Long serviceType_ID, Long user_ID, int offer) {
        this.serviceType_ID = serviceType_ID;
        this.user_ID = user_ID;
        this.offer = offer;
    }
}