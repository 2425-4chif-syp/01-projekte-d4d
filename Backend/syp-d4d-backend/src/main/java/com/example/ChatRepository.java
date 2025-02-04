package com.example;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import jakarta.ws.rs.WebApplicationException;

public class ChatRepository {
    private static final String URL = "jdbc:postgresql://localhost:5432/postgres";
    private static final String USER = "d4d-admin";
    private static final String PASSWORD = "d4d1234";

    // Tabelle erstellen, falls nicht vorhanden
    private static final String CREATE_CHATS_TABLE = """
        CREATE TABLE IF NOT EXISTS chats (
            id SERIAL PRIMARY KEY,
            chat_name VARCHAR(100) NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """;

    // Chat in die Datenbank einfügen
    private static final String INSERT_CHAT_SQL = """
        INSERT INTO chats (chat_name)
        VALUES (?);
    """;

    // Alle Chats aus der Datenbank abrufen
    private static final String SELECT_ALL_CHATS_SQL = """
        SELECT chat_name, created_at
        FROM chats
        ORDER BY created_at ASC;
    """;

    static {
        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             Statement statement = connection.createStatement()) {
            System.out.println("Ensuring chats table exists...");
            statement.execute(CREATE_CHATS_TABLE);
        } catch (SQLException e) {
            e.printStackTrace();
            System.out.println("Error while creating the chats table.");
        }
    }

    public static void saveChat(String chatName) {
        // Prüfen, ob der Chat bereits existiert
        if (chatExists(chatName)) {
            // Hier kannst du entweder einen Fehler werfen oder eine entsprechende Response zurückgeben.
            throw new jakarta.ws.rs.WebApplicationException(
                    "Chat already exists: " + chatName,
                    jakarta.ws.rs.core.Response.Status.CONFLICT
            );
        }

        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement insertStatement = connection.prepareStatement(INSERT_CHAT_SQL)) {

            System.out.println("Attempting to save chat: " + chatName);
            insertStatement.setString(1, chatName);
            int rowsInserted = insertStatement.executeUpdate();
            System.out.println(rowsInserted + " row(s) inserted successfully!");
            if (rowsInserted == 0) {
                throw new SQLException("No rows inserted for chat: " + chatName);
            }
        } catch (SQLException e) {
            System.out.println("Error occurred while inserting the chat: " + e.getMessage());
            throw new jakarta.ws.rs.WebApplicationException("Chat creation failed: " + e.getMessage(), e);
        }
    }

    public static boolean chatExists(String chatName) {
        String checkChatSql = "SELECT 1 FROM chats WHERE chat_name = ?";
        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement checkStmt = connection.prepareStatement(checkChatSql)) {
            checkStmt.setString(1, chatName);
            try (ResultSet rs = checkStmt.executeQuery()) {
                return rs.next(); // Gibt true zurück, wenn bereits ein Eintrag vorhanden ist
            }
        } catch (SQLException e) {
            e.printStackTrace();
            // Im Fehlerfall false zurückgeben, oder je nach Bedarf einen Fehler werfen
            return false;
        }
    }

    public static List<Chat> getAllChats() {
        List<Chat> chats = new ArrayList<>();

        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement selectStatement = connection.prepareStatement(SELECT_ALL_CHATS_SQL);
             ResultSet resultSet = selectStatement.executeQuery()) {

            while (resultSet.next()) {
                String chatName = resultSet.getString("chat_name");
                Timestamp createdAt = resultSet.getTimestamp("created_at");
                chats.add(new Chat(chatName, createdAt.toLocalDateTime()));
            }

        } catch (SQLException e) {
            e.printStackTrace();
            System.out.println("Error occurred while fetching chats.");
        }

        return chats;
    }
}
