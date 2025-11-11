package at.htl.entity;

import jakarta.persistence.*;
import java.sql.Timestamp;

@Entity
@Table(name="d4d_session")
public class Session {
    @Id
    @Column(name="sess_id", length=36)
    private String id;

    @Column(name="sess_created_at")
    private Timestamp createdAt;

    @Column(name="sess_expires_at")
    private Timestamp expiresAt;

    @ManyToOne
    @JoinColumn(name="sess_u_id")
    private User user;

    @Column(name="sess_is_anonymous")
    private boolean isAnonymous;

    public Session() {
        this.isAnonymous = true;
        this.createdAt = new Timestamp(System.currentTimeMillis());
        // Session läuft nach 24 Stunden ab
        this.expiresAt = new Timestamp(System.currentTimeMillis() + 24 * 60 * 60 * 1000);
    }

    public Session(String id) {
        this();
        this.id = id;
    }

    public Session(String id, User user) {
        this(id);
        this.user = user;
        this.isAnonymous = false;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Timestamp getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Timestamp createdAt) {
        this.createdAt = createdAt;
    }

    public Timestamp getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Timestamp expiresAt) {
        this.expiresAt = expiresAt;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
        if (user != null) {
            this.isAnonymous = false;
        }
    }

    public boolean isAnonymous() {
        return isAnonymous;
    }

    public void setAnonymous(boolean anonymous) {
        isAnonymous = anonymous;
    }

    public boolean isExpired() {
        return expiresAt.before(new Timestamp(System.currentTimeMillis()));
    }
}
