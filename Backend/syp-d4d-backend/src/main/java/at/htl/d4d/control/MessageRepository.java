package at.htl.d4d.control;

import at.htl.d4d.entity.Message;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;

@ApplicationScoped
public class MessageRepository implements PanacheRepository<Message> {

    public List<Message> getMessagesByChat(Long chatId) {
        // Nachrichten chronologisch (aufsteigend) sortieren
        return list("chatId = ?1 order by createdAt asc", chatId);
    }
}
