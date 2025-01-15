package com.example;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class ServiceResourceRepository {
    private static final String URL = "jdbc:postgresql://localhost:5432/postgres";
    private static final String USER = "d4d-admin";
    private static final String PASSWORD = "d4d1234";

    public static List<Service> getAllServices() {
        List<Service> services = new ArrayList<>();
        String query = "SELECT username, service_offer, service_wanted, description FROM user_services";

        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement statement = connection.prepareStatement(query)) {

            ResultSet resultSet = statement.executeQuery();
            while (resultSet.next()) {
                String name = resultSet.getString("username");
                String offer = resultSet.getString("service_offer");
                String wanted = resultSet.getString("service_wanted");
                String description = resultSet.getString("description");

                services.add(new Service(name, offer, wanted, description));
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }

        return services;
    }

    public static List<Service> getServicesByOffer(String serviceOffer) {
        List<Service> services = new ArrayList<>();
        String query = "SELECT username, service_offer, service_wanted, description FROM user_services WHERE service_offer = ?";

        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement statement = connection.prepareStatement(query)) {

            statement.setString(1, serviceOffer);
            ResultSet resultSet = statement.executeQuery();

            while (resultSet.next()) {
                String name = resultSet.getString("username");
                String offer = resultSet.getString("service_offer");
                String wanted = resultSet.getString("service_wanted");
                String description = resultSet.getString("description");

                services.add(new Service(name, offer, wanted, description));
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }

        return services;
    }

    public static List<Service> searchByName(String name) {
        List<Service> services = new ArrayList<>();
        String query = "SELECT username, service_offer, service_wanted, description FROM user_services WHERE LOWER(username) LIKE ?";

        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement statement = connection.prepareStatement(query)) {

            statement.setString(1, "%" + name.toLowerCase() + "%");
            ResultSet resultSet = statement.executeQuery();

            while (resultSet.next()) {
                String username = resultSet.getString("username");
                String offer = resultSet.getString("service_offer");
                String wanted = resultSet.getString("service_wanted");
                String description = resultSet.getString("description");

                services.add(new Service(username, offer, wanted, description));
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }

        return services;
    }

    public static List<Service> searchInDescription(String searchTerm) {
        List<Service> services = new ArrayList<>();
        String query = "SELECT username, service_offer, service_wanted, description FROM user_services WHERE LOWER(description) LIKE ?";

        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement statement = connection.prepareStatement(query)) {

            statement.setString(1, "%" + searchTerm.toLowerCase() + "%");
            ResultSet resultSet = statement.executeQuery();

            while (resultSet.next()) {
                String username = resultSet.getString("username");
                String offer = resultSet.getString("service_offer");
                String wanted = resultSet.getString("service_wanted");
                String description = resultSet.getString("description");

                services.add(new Service(username, offer, wanted, description));
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }

        return services;
    }
}
