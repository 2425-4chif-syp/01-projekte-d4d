package com.example;
public class Service {
    private String name;
    private String serviceOffer;
    private String serviceWanted;
    private String description;

    public void setName(String name) {
        this.name = name;
    }

    public void setServiceOffer(String serviceOffer) {
        this.serviceOffer = serviceOffer;
    }

    public void setServiceWanted(String serviceWanted) {
        this.serviceWanted = serviceWanted;
    }

    public String getServiceOffer() {
        return serviceOffer;
    }

    public String getName() {
        return name;
    }

    public String getServiceWanted() {
        return serviceWanted;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Service(String name, String serviceOffer, String serviceWanted, String description) {
        setName(name);
        setServiceOffer(serviceOffer);
        setServiceWanted(serviceWanted);
        setDescription(description);
        ServiceRepository.addService(this);
    }

}
