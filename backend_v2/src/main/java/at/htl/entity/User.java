package at.htl.entity;

import jakarta.persistence.*;

@Entity
@Table(name="d4d_user")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="u_id")
    private Long id;

    @Column(name="u_name")
    private String name;

    @Column(name="u_pupil_id")
    private String pupilId;

    @Column(name="u_email")
    private String email;

    public User() {

    }

    public User(String name) {
        this.name = name;
    }

    public User(String name, String pupilId) {
        this.name = name;
        this.pupilId = pupilId;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPupilId() {
        return pupilId;
    }

    public void setPupilId(String pupilId) {
        this.pupilId = pupilId;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}
