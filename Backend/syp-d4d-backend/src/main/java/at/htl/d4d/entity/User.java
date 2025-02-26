package at.htl.d4d.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import org.hibernate.annotations.CollectionIdJavaType;

public class User extends PanacheEntity {
    @Column
    public Long user_ID;

    @Column
    public String name;
}
