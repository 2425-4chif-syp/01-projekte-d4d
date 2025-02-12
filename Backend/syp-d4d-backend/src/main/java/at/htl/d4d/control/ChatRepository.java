package at.htl.d4d.control;

import at.htl.d4d.entity.Chat;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class ChatRepository {
    private static final String URL = "jdbc:postgresql://localhost:5432/postgres";
    private static final String USER = "d4d-admin";
    private static final String PASSWORD = "d4d1234";

    private static final String CREATE_CHATS_TABLE = """
        CREATE TABLE IF NOT EXISTS chats (
            id SERIAL PRIMARY KEY,
            chat_name VARCHAR(100) NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """;

    private static final String INSERT_CHAT_SQL = """
        INSERT INTO chats (chat_name)
        VALUES (?)
    """;

    static {
        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             Statement statement = connection.createStatement()) {
            System.out.println("Ensuring chats table exists...");
            statement.execute(CREATE_CHATS_TABLE);
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    public static void saveChat(String chatName) {
        // Hier kann – wie bereits gezeigt – ein Duplikat-Check erfolgen.
        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement insertStatement = connection.prepareStatement(INSERT_CHAT_SQL)) {

            System.out.println("Attempting to save chat: " + chatName);
            insertStatement.setString(1, chatName);
            int rowsInserted = insertStatement.executeUpdate();
            System.out.println(rowsInserted + " row(s) inserted successfully!");
        } catch (SQLException e) {
            e.printStackTrace();
            throw new jakarta.ws.rs.WebApplicationException("Chat creation failed: " + e.getMessage(), e);
        }
    }

    public static List<Chat> getAllChats() {
        List<Chat> chats = new ArrayList<>();
        String sql = "SELECT id, chat_name, created_at FROM chats ORDER BY created_at ASC";
        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement selectStatement = connection.prepareStatement(sql);
             ResultSet rs = selectStatement.executeQuery()) {
            while (rs.next()) {
                int id = rs.getInt("id");
                String chatName = rs.getString("chat_name");
                Timestamp createdAt = rs.getTimestamp("created_at");
                chats.add(new Chat(id, chatName, createdAt.toLocalDateTime()));
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return chats;
    }
}
