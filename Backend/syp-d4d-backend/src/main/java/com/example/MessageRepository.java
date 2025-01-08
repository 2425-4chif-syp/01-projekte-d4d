package com.example;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class MessageRepository {
    private static final String URL = "jdbc:postgresql://localhost:5432/postgres";
    private static final String USER = "d4d-admin";
    private static final String PASSWORD = "d4d1234";

    // Tabelle erstellen, falls nicht vorhanden
    private static final String CREATE_MESSAGES_TABLE = """
        CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            user_name VARCHAR(50) NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """;

    // Nachricht in die Datenbank einfügen
    private static final String INSERT_MESSAGE_SQL = """
        INSERT INTO messages (user_name, message)
        VALUES (?, ?);
    """;

    // Alle Nachrichten aus der Datenbank abrufen
    private static final String SELECT_ALL_MESSAGES_SQL = """
        SELECT user_name, message, created_at
        FROM messages
        ORDER BY created_at ASC;
    """;

    static {
        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             Statement statement = connection.createStatement()) {
            statement.execute(CREATE_MESSAGES_TABLE);
        } catch (SQLException e) {
            e.printStackTrace();
            System.out.println("Error while creating the messages table.");
        }
    }

    public static void saveMessage(String userName, String message) {
        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement insertStatement = connection.prepareStatement(INSERT_MESSAGE_SQL)) {

            insertStatement.setString(1, userName);
            insertStatement.setString(2, message);

            int rowsInserted = insertStatement.executeUpdate();
            System.out.println(rowsInserted + " row(s) inserted successfully!");

        } catch (SQLException e) {
            e.printStackTrace();
            System.out.println("Error occurred while inserting the message.");
        }
    }

    public static List<Message> getAllMessages() {
        List<Message> messages = new ArrayList<>();

        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement selectStatement = connection.prepareStatement(SELECT_ALL_MESSAGES_SQL);
             ResultSet resultSet = selectStatement.executeQuery()) {

            while (resultSet.next()) {
                String userName = resultSet.getString("user_name");
                String message = resultSet.getString("message");
                Timestamp createdAt = resultSet.getTimestamp("created_at");

                messages.add(new Message(userName, message, createdAt.toLocalDateTime()));
            }

        } catch (SQLException e) {
            e.printStackTrace();
            System.out.println("Error occurred while fetching messages.");
        }

        return messages;
    }
}
