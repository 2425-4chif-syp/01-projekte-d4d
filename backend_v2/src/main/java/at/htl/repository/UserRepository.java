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
}
