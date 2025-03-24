package at.htl.d4d.control;

import java.util.List;
import at.htl.d4d.entity.Market;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

@ApplicationScoped
public class MarketRepository implements PanacheRepository<Market> {

    public MarketRepository(){}

    public List<Market> getAllMarkets(){
        return listAll();
    }

    public List<Market> findMarketOffersByUser(Long user_id){
        return find("user_ID = ?1 and offer = 1", user_id).list();
    }

    public List<Market> findMarketDemandsByUser(Long user_id){
        return find("user_ID = ?1 and offer = 0", user_id).list();
    }
}
