package at.htl.testdata;

import at.htl.entity.ServiceType;
import at.htl.repository.ServiceTypeRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;

@ApplicationScoped
public class ServiceTypeTestData {
    @Inject
    ServiceTypeRepository serviceTypeRepository;

    @Inject
    EntityManager entityManager;

    public void generateServiceTypesTestData() {
        entityManager.createNativeQuery("DELETE FROM d4d_service_type").executeUpdate();

        serviceTypeRepository.persist(new ServiceType("Computerarchitektur und Betriebssysteme", null));
        serviceTypeRepository.persist(new ServiceType("Programmierung und Software Engineering", null));
        serviceTypeRepository.persist(new ServiceType("Datenbanken und Informationssysteme", null));
        serviceTypeRepository.persist(new ServiceType("Netzwerksysteme & Cyber Security", null));
        serviceTypeRepository.persist(new ServiceType("Webprogrammierung und Mobile Computing", null));
        serviceTypeRepository.persist(new ServiceType("Data Science und Artificial Intelligence", null));
        serviceTypeRepository.persist(new ServiceType("Rechnungswesen", null));
        serviceTypeRepository.persist(new ServiceType("Betriebliche Organisation", null));
        serviceTypeRepository.persist(new ServiceType("Recht", null));
        serviceTypeRepository.persist(new ServiceType("Systemplanung und Projektentwicklung", null));
        serviceTypeRepository.persist(new ServiceType("Physik", null));
        serviceTypeRepository.persist(new ServiceType("Chemie", null));
        serviceTypeRepository.persist(new ServiceType("Angewandte Mathematik", null));
        serviceTypeRepository.persist(new ServiceType("Deutsch", null));
        serviceTypeRepository.persist(new ServiceType("Englisch", null));
    }
}
