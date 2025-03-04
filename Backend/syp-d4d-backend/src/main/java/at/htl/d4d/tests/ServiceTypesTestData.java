package at.htl.d4d.tests;

import at.htl.d4d.control.ServiceTypesRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class ServiceTypesTestData {
    @Inject
    ServiceTypesRepository serviceTypesRepository;

    public void generateServiceTypesTestData() {
        serviceTypesRepository.addServiceType("Computerarchitektur und Betriebssysteme");
        serviceTypesRepository.addServiceType("Programmierung und Software Engineering");
        serviceTypesRepository.addServiceType("Datenbanken und Informationssysteme");
        serviceTypesRepository.addServiceType("Netzwerksysteme & Cyber Security");
        serviceTypesRepository.addServiceType("Webprogrammierung und Mobile Computing");
        serviceTypesRepository.addServiceType("Data Science und Artificial Intelligence");
        serviceTypesRepository.addServiceType("Rechnungswesen");
        serviceTypesRepository.addServiceType("Betriebliche Organisation");
        serviceTypesRepository.addServiceType("Recht");
        serviceTypesRepository.addServiceType("Systemplanung und Projektentwicklung");
        serviceTypesRepository.addServiceType("Physik");
        serviceTypesRepository.addServiceType("Chemie");
        serviceTypesRepository.addServiceType("Angewandte Mathematik");
        serviceTypesRepository.addServiceType("Deutsch");
        serviceTypesRepository.addServiceType("Englisch");
    }
}
