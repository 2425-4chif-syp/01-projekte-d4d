package at.htl.d4d.control;

import java.util.List;
import at.htl.d4d.entity.Market;
import io.quarkus.hibernate.orm.panache.PanacheRepository;

public class MarketRepository implements PanacheRepository<Market> {

    public MarketRepository(){}

    public Market findMarketById(Long id){
        return findById(id);
    }

    public List<Market> findMarketsByServiceType(String serviceType){
        return find("serviceType", serviceType).list();
    }

    public Market saveMarket(Market market){
        persist(market);
        return market;
    }

    public List<Market> getAllMarkets(){
        return listAll();
    }
}
