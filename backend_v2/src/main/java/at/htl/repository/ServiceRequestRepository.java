package at.htl.repository;

import at.htl.entity.ServiceRequest;
import at.htl.entity.User;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class ServiceRequestRepository implements PanacheRepository<ServiceRequest> {

    /**
     * Find all service requests received by a specific user, ordered by newest first
     */
    public List<ServiceRequest> findByReceiver(User receiver) {
        return list("receiver = ?1 ORDER BY createdAt DESC", receiver);
    }

    /**
     * Find all service requests sent by a specific user
     */
    public List<ServiceRequest> findBySender(User sender) {
        return list("sender = ?1 ORDER BY createdAt DESC", sender);
    }

    /**
     * Check if a request already exists for a specific sender, receiver, and market
     */
    public boolean requestExists(User sender, User receiver, Long marketId) {
        return count("sender = ?1 AND receiver = ?2 AND market.id = ?3 AND status = 'PENDING'", 
                     sender, receiver, marketId) > 0;
    }
}
