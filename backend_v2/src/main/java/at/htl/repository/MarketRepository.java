package at.htl.repository;

import at.htl.entity.Market;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class MarketRepository implements PanacheRepository<Market> {

}
