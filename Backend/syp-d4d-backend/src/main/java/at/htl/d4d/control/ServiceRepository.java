package at.htl.d4d.control;

import at.htl.d4d.entity.Service;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class ServiceRepository implements PanacheRepository<Service> {

}
