package com.example;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;

public class ServiceControllerRepository {

    private static final String URL = "jdbc:postgresql://localhost:5432/postgres";
    private static final String USER = "d4d-admin";
    private static final String PASSWORD = "d4d1234";

    public static void fillServiceDB(Service service) {
        String createServiceTable = """
            CREATE TABLE IF NOT EXISTS user_services (
                username VARCHAR(50) NOT NULL,
                service_offer VARCHAR(100) NOT NULL,
                service_wanted VARCHAR(100) NOT NULL,
                description VARCHAR(250) NOT NULL      
            );
        """;

        String insertServiceSQL = """
            INSERT INTO user_services (username, service_offer, service_wanted, description)
            VALUES (?, ?, ?, ?);
        """;

        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement createTableStatement = connection.prepareStatement(createServiceTable);
             PreparedStatement insertStatement = connection.prepareStatement(insertServiceSQL)) {

            // Create the table if it doesn't exist
            createTableStatement.execute();
            System.out.println("Table 'user_services' created or already exists.");

            // Insert the service data
            insertStatement.setString(1, service.getName());
            insertStatement.setString(2, service.getServiceOffer());
            insertStatement.setString(3, service.getServiceWanted());
            insertStatement.setString(4, service.getDescription());

            int rowsInserted = insertStatement.executeUpdate();
            System.out.println(rowsInserted + " row(s) inserted successfully!");

        } catch (SQLException e) {
            e.printStackTrace();
            System.out.println("Error occurred while creating the table or inserting the data.");
        }
    }
}