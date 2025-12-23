package at.htl.repository;

import at.htl.entity.User;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class UserRepository implements PanacheRepository<User> {
    User activeUser = new User();

    public void setActiveUser(User activeUser) {
        this.activeUser = activeUser;
    }

    public User getActiveUser() {
        return activeUser;
    }
    
    /**
     * Findet einen User anhand von pupilId oder name
     * @param identifier pupilId oder name
     * @return User oder null
     */
    public User findByPupilIdOrName(String identifier) {
        if (identifier == null || identifier.isEmpty()) {
            return null;
        }
        
        // Zuerst nach pupilId suchen (eindeutig)
        User user = find("pupilId", identifier).firstResult();
        
        // Falls nicht gefunden, nach name suchen
        if (user == null) {
            user = find("name", identifier).firstResult();
        }
        
        return user;
    }
}
