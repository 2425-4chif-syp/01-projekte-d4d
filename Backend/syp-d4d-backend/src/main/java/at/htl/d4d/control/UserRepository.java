package at.htl.d4d.control;

import java.util.List;

import at.htl.d4d.entity.User;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class UserRepository implements PanacheRepository<User> {

    public boolean existsByName(String name) {
        return find("name", name).count() > 0;
    }

    public User findUserByName(String name) {
        return find("name", name).firstResult();
    }

    public List<User> getAllUsers() {
        return listAll();
    }

    public String findUserById(Long id) {
        return findById(id).getName();
    }
}
