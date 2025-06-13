package at.htl.entity;

import jakarta.persistence.*;

import java.sql.Timestamp;

@Entity
@Table(name="d4d_service_type")
public class ServiceType {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="st_id")
    private Long id;

    @Column(name="st_name")
    private String name;

    @Column(name="st_deleted_at")
    private Timestamp deletedAt;

    public ServiceType() {

    }

    public ServiceType(String name, Timestamp deletedAt) {
        this.name = name;
        this.deletedAt = deletedAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Timestamp getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(Timestamp deletedAt) {
        this.deletedAt = deletedAt;
    }
}
