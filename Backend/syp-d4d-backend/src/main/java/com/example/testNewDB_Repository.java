package com.example;

import java.sql.*;

public class testNewDB_Repository {
    private static final String URL = "jdbc:postgresql://localhost:5432/postgres";
    private static final String USER = "d4d-admin";
    private static final String PASSWORD = "d4d1234";

    public static void createUserDB() {
        String createUserTable = """
            CREATE TABLE IF NOT EXISTS "user" (
                user_ID SERIAL PRIMARY KEY,
                name VARCHAR(255),
                username VARCHAR(255) UNIQUE,
                email VARCHAR(255) UNIQUE,
                password VARCHAR(255),
                description VARCHAR(255),
                payPal_Email VARCHAR(255),
                strengths VARCHAR(255),
                weaknesses VARCHAR(255),
                city VARCHAR(255)
            );
        """;

        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement createTableStatement = connection.prepareStatement(createUserTable)) {

            createTableStatement.execute();
            System.out.println("Table 'user' created or already exists.");

        } catch (SQLException e) {
            e.printStackTrace();
            System.out.println("Error occurred while creating the table.");
        }
    }

    public static void createTypeOfServiceDB(){
        String createTypeOfServiceTable = """
            CREATE TABLE IF NOT EXISTS typeOfService (
                serviceType_ID SERIAL PRIMARY KEY,
                serviceType VARCHAR(255) NOT NULL
            );
        """;

        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement createTableStatement = connection.prepareStatement(createTypeOfServiceTable)) {

            createTableStatement.execute();
            System.out.println("Table 'typeOfService' created or already exists.");

        } catch (SQLException e) {
            e.printStackTrace();
            System.out.println("Error occurred while creating the table.");
        }
    }

    public static void createServiceDB(){
        String createServiceTable = """
            CREATE TABLE IF NOT EXISTS "service" (
                service_ID SERIAL PRIMARY KEY,
                marketProvider_ID INT REFERENCES "user"(user_ID),
                marketClient_ID INT REFERENCES "user"(user_ID),
                exchangeService INT REFERENCES service(service_ID),
                description VARCHAR(255)
            );
        """;

        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement createTableStatement = connection.prepareStatement(createServiceTable)) {

            createTableStatement.execute();
            System.out.println("Table 'service' created or already exists.");

        } catch (SQLException e) {
            e.printStackTrace();
            System.out.println("Error occurred while creating the table.");
        }
    }

    public static void createMarketDB(){
        String createMarketTable = """
            CREATE TABLE IF NOT EXISTS market (
                market_ID SERIAL PRIMARY KEY,
                serviceType_ID INT REFERENCES typeOfService(serviceType_ID),
                user_ID INT REFERENCES "user"(user_ID),
                offer INT
            );
        """;

        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement createTableStatement = connection.prepareStatement(createMarketTable)) {

            createTableStatement.execute();
            System.out.println("Table 'market' created or already exists.");

        } catch (SQLException e) {
            e.printStackTrace();
            System.out.println("Error occurred while creating the table.");
        }
    }

    public static void createChatEntryDB(){
        String createChatEntryTable = """
            CREATE TABLE IF NOT EXISTS chatEntry (
                chat_ID SERIAL PRIMARY KEY,
                sender_ID INT REFERENCES "user"(user_ID),
                receiver_ID INT REFERENCES "user"(user_ID),
                message VARCHAR(255),
                time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """;

        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement createTableStatement = connection.prepareStatement(createChatEntryTable)) {

            createTableStatement.execute();
            System.out.println("Table 'chatEntry' created or already exists.");

        } catch (SQLException e) {
            e.printStackTrace();
            System.out.println("Error occurred while creating the table.");
        }
    }
    
    public static void createReviewTable(){
        String createReviewTable = """
            CREATE TABLE IF NOT EXISTS review (
                rating_ID SERIAL PRIMARY KEY,
                evaluatee_ID INT REFERENCES "user"(user_ID),
                evaluator_ID INT REFERENCES "user"(user_ID),
                serviceType_ID INT REFERENCES typeOfService(serviceType_ID),
                rating DOUBLE PRECISION,
                comment VARCHAR(255)
            );
        """;

        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement createTableStatement = connection.prepareStatement(createReviewTable)) {

            createTableStatement.execute();
            System.out.println("Table 'review' created or already exists.");

        } catch (SQLException e) {
            e.printStackTrace();
            System.out.println("Error occurred while creating the table.");
        }
    }
}
