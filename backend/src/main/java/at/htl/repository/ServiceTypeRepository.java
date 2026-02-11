package at.htl.repository;

import at.htl.entity.ServiceType;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class ServiceTypeRepository implements PanacheRepository<ServiceType> {

}
