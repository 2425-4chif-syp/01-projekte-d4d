package at.htl.repository;

import at.htl.entity.Session;
import at.htl.entity.SessionServiceType;
import at.htl.entity.ServiceType;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class SessionServiceTypeRepository implements PanacheRepository<SessionServiceType> {
    
    public List<SessionServiceType> findBySession(Session session) {
        return list("session", session);
    }
    
    public List<SessionServiceType> findBySessionAndIsOffer(Session session, boolean isOffer) {
        return list("session = ?1 and isOffer = ?2", session, isOffer);
    }
    
    public void deleteBySession(Session session) {
        delete("session", session);
    }
    
    public boolean existsBySessionAndServiceType(Session session, ServiceType serviceType, boolean isOffer) {
        return count("session = ?1 and serviceType = ?2 and isOffer = ?3", 
                     session, serviceType, isOffer) > 0;
    }
}
