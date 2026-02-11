package at.htl.repository;

import at.htl.entity.Session;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.sql.Timestamp;
import java.util.List;

@ApplicationScoped
public class SessionRepository implements PanacheRepositoryBase<Session, String> {
    
    public Session findByIdOrNull(String sessionId) {
        Session session = findById(sessionId);
        if (session != null && session.isExpired()) {
            // Session abgelaufen, lösche sie
            delete(session);
            return null;
        }
        return session;
    }
    
    public void deleteExpiredSessions() {
        Timestamp now = new Timestamp(System.currentTimeMillis());
        delete("expiresAt < ?1", now);
    }
    
    public List<Session> findByUserId(Long userId) {
        return list("user.id", userId);
    }
}
