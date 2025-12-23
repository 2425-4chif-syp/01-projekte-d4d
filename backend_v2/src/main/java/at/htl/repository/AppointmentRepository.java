package at.htl.repository;

import at.htl.entity.Appointment;
import at.htl.entity.User;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.LocalDateTime;
import java.util.List;

@ApplicationScoped
public class AppointmentRepository implements PanacheRepository<Appointment> {

    /**
     * Findet alle Termine für einen User (als Proposer oder Recipient)
     */
    public List<Appointment> findByUser(User user) {
        return list("proposer = ?1 OR recipient = ?1", user);
    }

    /**
     * Findet alle Termine für einen User in einem bestimmten Zeitraum
     */
    public List<Appointment> findByUserAndDateRange(User user, LocalDateTime start, LocalDateTime end) {
        return list(
            "(proposer = ?1 OR recipient = ?1) AND startTime >= ?2 AND startTime <= ?3 ORDER BY startTime ASC",
            user, start, end
        );
    }

    /**
     * Findet alle bestätigten Termine für einen User
     */
    public List<Appointment> findConfirmedByUser(User user) {
        return list(
            "(proposer = ?1 OR recipient = ?1) AND status = ?2 ORDER BY startTime ASC",
            user, Appointment.Status.CONFIRMED
        );
    }

    /**
     * Findet ausstehende Terminanfragen für einen User (als Empfänger)
     */
    public List<Appointment> findPendingForRecipient(User user) {
        return list(
            "recipient = ?1 AND status = ?2 ORDER BY createdAt DESC",
            user, Appointment.Status.PENDING
        );
    }

    /**
     * Prüft auf Terminüberschneidungen (Double Booking Prevention)
     */
    public List<Appointment> findOverlappingAppointments(User user, LocalDateTime start, LocalDateTime end) {
        return list(
            "(proposer = ?1 OR recipient = ?1) AND status = ?2 AND " +
            "((startTime < ?4 AND endTime > ?3))",
            user, Appointment.Status.CONFIRMED, start, end
        );
    }

    /**
     * Prüft ob ein Double Booking vorliegen würde
     */
    public boolean hasConflict(User user, LocalDateTime start, LocalDateTime end) {
        return !findOverlappingAppointments(user, start, end).isEmpty();
    }

    /**
     * Findet Termine zwischen zwei bestimmten Usern
     */
    public List<Appointment> findBetweenUsers(User user1, User user2) {
        return list(
            "((proposer = ?1 AND recipient = ?2) OR (proposer = ?2 AND recipient = ?1)) " +
            "ORDER BY startTime ASC",
            user1, user2
        );
    }

    /**
     * Findet anstehende Termine (in der Zukunft)
     */
    public List<Appointment> findUpcomingByUser(User user) {
        return list(
            "(proposer = ?1 OR recipient = ?1) AND status = ?2 AND startTime > ?3 ORDER BY startTime ASC",
            user, Appointment.Status.CONFIRMED, LocalDateTime.now()
        );
    }
}
