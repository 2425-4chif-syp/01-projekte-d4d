package com.example;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class ServiceTypesControllerRepository {
    private static final String URL = "jdbc:postgresql://localhost:5432/postgres";
    private static final String USER = "d4d-admin";
    private static final String PASSWORD = "d4d1234";

    public static void fillServiceTypesDB(String serviceTypeToAdd) {
        String createServiceTypesTable = """
            CREATE TABLE IF NOT EXISTS service_types (
                typeOfService VARCHAR(50) NOT NULL,
                deleted_at TIMESTAMP DEFAULT NULL
            );
        """;

        String insertServiceTypeSQL = """
            INSERT INTO service_types (typeOfService)
            VALUES (?);
        """;

        String updateServiceTypeSQL = """
            UPDATE service_types 
            SET deleted_at = NULL 
            WHERE LOWER(serviceTypeToAdd) = LOWER(?)
        """;

        List<ServiceType> typeOfServices = getServiceTypes();

        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement createTableStatement = connection.prepareStatement(createServiceTypesTable);
             PreparedStatement updateStatement = connection.prepareStatement(updateServiceTypeSQL);
             PreparedStatement insertStatement = connection.prepareStatement(insertServiceTypeSQL)) {

            createTableStatement.execute();

            boolean alreadyExists = false;

            for (var typeOfService : typeOfServices) {
                if (typeOfService.getTypeOfService().toLowerCase().equals(serviceTypeToAdd.toLowerCase())) {
                    alreadyExists = true;

                    if (typeOfService.getDeletedAt() != null) {
                        updateStatement.setString(1, serviceTypeToAdd);
                        int rowsUpdated = updateStatement.executeUpdate();
                        System.out.println(rowsUpdated + " row(s) updated successfully!");
                    }
                }
            }

            if (!alreadyExists) {
                insertStatement.setString(1, serviceTypeToAdd.substring(0, 1).toUpperCase()
                        + serviceTypeToAdd.substring(1));
            }

            int rowsInserted = insertStatement.executeUpdate();
            System.out.println(rowsInserted + " row(s) inserted successfully!");

        } catch (SQLException e) {
            e.printStackTrace();
            System.out.println("Error occurred while creating the table or inserting the data.");
        }
    }

    public static List<ServiceType> getServiceTypes() {
        List<ServiceType> typeOfServices = new ArrayList<>();
        String selectServiceTypesSQL = "SELECT typeOfService, deleted_at FROM service_types WHERE deleted_at IS NULL ORDER BY service_types ASC";

        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement statement = connection.prepareStatement(selectServiceTypesSQL)) {

            ResultSet resultSet = statement.executeQuery();

            while (resultSet.next()) {
                String serviceType = resultSet.getString("typeOfService");
                Timestamp deletedAt = resultSet.getTimestamp("deleted_at");
                typeOfServices.add(new ServiceType(serviceType, deletedAt));
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }

        return typeOfServices;
    }

    public static boolean deleteServiceType(String typeOfService) {
        String deleteServiceTypeSQL = "UPDATE service_types SET deleted_at = CURRENT_TIMESTAMP WHERE LOWER(typeOfService) = LOWER(?)";

        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement statement = connection.prepareStatement(deleteServiceTypeSQL)) {

            statement.setString(1, typeOfService);
            int rowsUpdated = statement.executeUpdate();
            return rowsUpdated > 0;

        } catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }
}