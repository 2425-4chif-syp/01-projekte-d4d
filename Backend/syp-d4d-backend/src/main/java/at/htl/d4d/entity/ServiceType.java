package at.htl.d4d.entity;

import java.sql.Timestamp;

public class ServiceType {
    private String typeOfService;
    private Timestamp deletedAt;

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

}
