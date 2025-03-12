package at.htl.d4d.control;

import java.util.List;
import at.htl.d4d.entity.Market;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

@ApplicationScoped
public class MarketRepository implements PanacheRepository<Market> {

    public MarketRepository(){}

    public Market findMarketById(Long id){
        return findById(id);
    }

    public List<Market> findMarketsByServiceType(String serviceType){
        return find("serviceType", serviceType).list();
    }

    @Transactional
    public Market saveMarket(Market market){
        persist(market);
        return market;
    }

    public List<Market> getAllMarkets(){
        return listAll();
    }

    public Market findMarketByUser(Long userId){
        return find("user_ID", userId).firstResult();
    }

    public Boolean hasMarketWithOfferAndWant(Long userId){
        return find("user_ID = ?1 and offer = 1", userId).count() > 0
                && find("user_ID = ?1 and offer = 0", userId).count() > 0;
    } 
}
