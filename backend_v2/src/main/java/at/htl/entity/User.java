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

    public User() {

    }

    public User(String name) {
        this.name = name;
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
}
