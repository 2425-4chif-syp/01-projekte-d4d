package at.htl.d4d.control;

import at.htl.d4d.entity.Service;
import at.htl.d4d.entity.User;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.ArrayList;
import java.util.List;

@ApplicationScoped
public class ServiceRepository implements PanacheRepository<Service> {

    @Inject
    MarketRepository marketRepository;

    public List<Service> getServicesByUser(User user) {
        List<Service> allServices = getAllServices();
        List<Service> servicesByUser = new ArrayList<>();

        for (Service service : allServices) {
            if (marketRepository.getMarketById(service.getMarketClient_ID()).user_ID.equals(user.id)
                    || marketRepository.getMarketById(service.getMarketClient_ID()).user_ID.equals(user.id)) {
                servicesByUser.add(service);
            }
        }
        return servicesByUser;
    }

    public List<Service> getAllServices() {
        return listAll();
    }
}
