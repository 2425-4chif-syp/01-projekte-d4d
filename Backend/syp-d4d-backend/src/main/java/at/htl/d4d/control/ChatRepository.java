package at.htl.d4d.control;

import at.htl.d4d.entity.ChatEntry;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;

@ApplicationScoped
public class ChatRepository implements PanacheRepository<ChatEntry> {

    // Liefert alle Nachrichten zwischen zwei Nutzern, sortiert nach Zeit (aufsteigend)
    public List<ChatEntry> getMessagesBetween(Long userId, Long partnerId) {
        return list("""
        ((sender_ID = ?1 AND receiver_ID = ?2)
          OR (sender_ID = ?2 AND receiver_ID = ?1))
        ORDER BY time ASC
        """, userId, partnerId);
    }

}
