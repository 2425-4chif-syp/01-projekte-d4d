package com.example;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class ServiceTypesControllerRepository {
    private static final String URL = "jdbc:postgresql://localhost:5432/postgres";
    private static final String USER = "d4d-admin";
    private static final String PASSWORD = "d4d1234";

    public static void fillServiceTypesDB(String serviceType) {
        String createServiceTypesTable = """
            CREATE TABLE IF NOT EXISTS service_types (
                typeOfService VARCHAR(50) NOT NULL
            );
        """;

        String insertServiceTypeSQL = """
            INSERT INTO service_types (typeOfService)
            VALUES (?);
        """;

        String selectServiceTypesSQL = "SELECT typeOfService FROM service_types";
        List<String> typeOfServices = new ArrayList<>();

        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement statement = connection.prepareStatement(selectServiceTypesSQL)) {

            ResultSet resultSet = statement.executeQuery();

            while (resultSet.next()) {
                String typeOfService = resultSet.getString("typeOfService");
                typeOfServices.add(typeOfService);
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }

        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement createTableStatement = connection.prepareStatement(createServiceTypesTable);
             PreparedStatement insertStatement = connection.prepareStatement(insertServiceTypeSQL)) {

            createTableStatement.execute();

            boolean alreadyExists = false;

            for (String typeOfService : typeOfServices) {
                if (typeOfService.toLowerCase().equals(serviceType.toLowerCase())) {
                    alreadyExists = true;
                }
            }

            if (!alreadyExists) {
                insertStatement.setString(1, serviceType.substring(0, 1).toUpperCase() + serviceType.substring(1));
            }

            int rowsInserted = insertStatement.executeUpdate();
            System.out.println(rowsInserted + " row(s) inserted successfully!");

        } catch (SQLException e) {
            e.printStackTrace();
            System.out.println("Error occurred while creating the table or inserting the data.");
        }
    }

    public static List<String> getServiceTypes() {
        List<String> typeOfServices = new ArrayList<>();
        String selectServiceTypesSQL = "SELECT typeOfService FROM service_types";

        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement statement = connection.prepareStatement(selectServiceTypesSQL)) {

            ResultSet resultSet = statement.executeQuery();

            while (resultSet.next()) {
                typeOfServices.add(resultSet.getString("typeOfService"));
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }

        return typeOfServices;
    }
}