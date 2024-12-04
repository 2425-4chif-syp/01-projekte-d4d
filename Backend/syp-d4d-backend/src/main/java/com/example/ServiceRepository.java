package com.example;

import java.util.ArrayList;
import java.util.List;

public abstract class ServiceRepository {
    private static List<Service> services = new ArrayList<>();
    public static List<Service> getAllServices() {
        return services;
    }

    public static void addService(Service service) {
        services.add(service);
    }

    public static List<Service> getServices(String serviceOffer) {
        List<Service> offers = new ArrayList<>();

        if (serviceOffer.equals("all")) {
            for (Service s: services) {
                offers.add(s);
            }
            return offers;
        }

        for (Service s : services) {
            if (s.getServiceOffer().equals(serviceOffer)) {
                offers.add(s);
            }
        }
        return offers;
    }
}
