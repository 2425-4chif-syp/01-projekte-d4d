package at.htl.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Entity
@Table(name = "d4d_appointment")
public class Appointment {

    public enum Status {
        PENDING,    // Vorgeschlagen, wartet auf Bestätigung
        CONFIRMED,  // Bestätigt
        REJECTED,   // Abgelehnt
        CANCELLED,  // Storniert
        COMPLETED   // Abgeschlossen
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ap_id")
    private Long id;

    @ManyToOne
    @JoinColumn(name = "ap_proposer_id", nullable = false)
    private User proposer; // Wer den Termin vorgeschlagen hat

    @ManyToOne
    @JoinColumn(name = "ap_recipient_id", nullable = false)
    private User recipient; // Wer den Termin bestätigen muss

    @ManyToOne
    @JoinColumn(name = "ap_service_type_id")
    private ServiceType serviceType; // Optionaler Bezug zum Fach

    @Column(name = "ap_title", nullable = false)
    private String title;

    @Column(name = "ap_description")
    private String description;

    @Column(name = "ap_start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "ap_end_time", nullable = false)
    private LocalDateTime endTime;

    @Column(name = "ap_timezone")
    private String timezone = "Europe/Vienna";

    @Enumerated(EnumType.STRING)
    @Column(name = "ap_status", nullable = false)
    private Status status = Status.PENDING;

    @Column(name = "ap_created_at")
    private LocalDateTime createdAt;

    @Column(name = "ap_updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "ap_location")
    private String location; // z.B. "Online" oder Raumnummer

    @Column(name = "ap_notes")
    private String notes; // Zusätzliche Notizen

    public Appointment() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public Appointment(User proposer, User recipient, String title, LocalDateTime startTime, LocalDateTime endTime) {
        this();
        this.proposer = proposer;
        this.recipient = recipient;
        this.title = title;
        this.startTime = startTime;
        this.endTime = endTime;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getProposer() { return proposer; }
    public void setProposer(User proposer) { this.proposer = proposer; }

    public User getRecipient() { return recipient; }
    public void setRecipient(User recipient) { this.recipient = recipient; }

    public ServiceType getServiceType() { return serviceType; }
    public void setServiceType(ServiceType serviceType) { this.serviceType = serviceType; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDateTime getStartTime() { return startTime; }
    public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }

    public LocalDateTime getEndTime() { return endTime; }
    public void setEndTime(LocalDateTime endTime) { this.endTime = endTime; }

    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }

    public Status getStatus() { return status; }
    public void setStatus(Status status) { 
        this.status = status; 
        this.updatedAt = LocalDateTime.now();
    }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    // Hilfsmethode: Prüft ob Termin mit anderem überlappt
    public boolean overlapsWith(Appointment other) {
        return this.startTime.isBefore(other.endTime) && this.endTime.isAfter(other.startTime);
    }

    // Hilfsmethode: Dauer in Minuten
    public long getDurationMinutes() {
        return java.time.Duration.between(startTime, endTime).toMinutes();
    }
}
