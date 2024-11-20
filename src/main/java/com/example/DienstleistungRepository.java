package com.example;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import javax.enterprise.context.ApplicationScoped;
import java.util.List;

@ApplicationScoped
public class DienstleistungRepository implements PanacheRepository<Dienstleistung> {

    public List<Dienstleistung> findByServiceType(String serviceType) {
        return find("serviceType", serviceType).list();
    }
}
