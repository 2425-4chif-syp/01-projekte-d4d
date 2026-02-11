package at.htl.repository;

import at.htl.entity.ChatEntry;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class ChatEntryRepository implements PanacheRepository<ChatEntry> {
}
