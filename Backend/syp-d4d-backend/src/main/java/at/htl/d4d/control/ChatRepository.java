package at.htl.d4d.control;

import at.htl.d4d.entity.Chat;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class ChatRepository implements PanacheRepository<Chat> {

    // Beispiel-Methode
    public Chat findChatById(Long id) {
        return findById(id);
    }
}
