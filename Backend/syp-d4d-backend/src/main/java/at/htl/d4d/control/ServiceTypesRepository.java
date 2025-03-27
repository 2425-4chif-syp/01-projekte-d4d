package at.htl.d4d.control;

import at.htl.d4d.entity.ServiceType;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

@ApplicationScoped
public class ServiceTypesRepository implements PanacheRepository<ServiceType> {

    @Transactional
    public void addServiceType(String serviceTypeToAdd) {
        ServiceType existing = find("LOWER(typeOfService)", serviceTypeToAdd.toLowerCase()).firstResult();

        if (existing != null) {
            if (existing.getDeletedAt() != null) {
                existing.setDeletedAt(null);  // Reaktivieren, falls es gelöscht war
                persist(existing);
            }{
                existing.setDeletedAt(null); // Reaktivieren, falls es gelöscht war
                persist(existing);
            }
        } else {
            ServiceType newType = new ServiceType(
                    serviceTypeToAdd.substring(0, 1).toUpperCase() + serviceTypeToAdd.substring(1),
                    null
            );
            persist(newType);
        }
    }

    public List<ServiceType> getAllServiceTypes() {
        return listAll();
    }

    public List<ServiceType> getActiveServiceTypes() {
        return list("deletedAt IS NULL ORDER BY typeOfService");
    }

    public ServiceType findServiceTypeByName(String typeOfService) {
        return find("LOWER(typeOfService)", typeOfService.toLowerCase()).firstResult();
    }

    @Transactional
    public boolean deleteServiceType(String typeOfService) {
        ServiceType existing = find("LOWER(typeOfService)", typeOfService.toLowerCase()).firstResult();
        if (existing != null && existing.getDeletedAt() == null) {
            existing.setDeletedAt(new Timestamp(System.currentTimeMillis()));
            persist(existing);
            return true;
        }
        return false;
    }

    public String findServiceTypeById(Long id) {
        return findById(id).getTypeOfService();
    }
}