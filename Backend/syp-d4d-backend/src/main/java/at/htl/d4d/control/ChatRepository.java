package at.htl.d4d.control;

import at.htl.d4d.entity.ChatEntry;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;

@ApplicationScoped
public class ChatRepository implements PanacheRepository<ChatEntry> {

    // Liefert alle Nachrichten zwischen zwei Nutzern, sortiert nach Zeit (aufsteigend)
    public List<ChatEntry> getMessagesBetween(Long userId, Long partnerId) {
        return list("((sender_ID = ?1 and receiver_ID = ?2) or (sender_ID = ?2 and receiver_ID = ?1)) order by time asc", userId, partnerId);
    }
}
