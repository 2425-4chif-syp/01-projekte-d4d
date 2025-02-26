package at.htl.d4d.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import org.hibernate.annotations.CollectionIdJavaType;

public class User extends PanacheEntity {
    @Column
    public String name;

    public User() {}

    public User(String name) {
        this.name = name;
    }

    public String getName() {
        return name;
    }
}
