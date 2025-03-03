package at.htl.d4d.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.sql.Timestamp;

@Entity
@Table(name = "type_of_service")
public class ServiceType extends PanacheEntity {

    @Column(unique = true, nullable = false)
    private String typeOfService;

    @Column
    private Timestamp deletedAt;

    public ServiceType() {}

    public ServiceType(String typeOfService, Timestamp deletedAt) {
        this.typeOfService = typeOfService;
        this.deletedAt = deletedAt;
    }

    public String getTypeOfService() {
        return typeOfService;
    }

    public Timestamp getDeletedAt() {
        return deletedAt;
    }

    public void setTypeOfService(String typeOfService) {
        this.typeOfService = typeOfService;
    }

    public void setDeletedAt(Timestamp deletedAt) {
        this.deletedAt = deletedAt;
    }
}
