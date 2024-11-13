package com.example;

import java.util.ArrayList;
import java.util.List;

public abstract class UserRepository {
    private static List<User> users = new ArrayList<>();
    public static List<User> getAllUsers() {
        return users;
    }

    public static void addUser(User user) {
        users.add(user);
    }

    public static List<User> getServices(String serviceOffer) {
        List<User> offers = new ArrayList<>();

        for (User u : users) {
            if (u.getServiceOffer().equals(serviceOffer)) {
                offers.add(u);
            }
        }
        return offers;
    }
}
