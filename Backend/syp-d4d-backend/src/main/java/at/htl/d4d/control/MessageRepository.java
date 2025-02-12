package at.htl.d4d.control;

import at.htl.d4d.entity.Message;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class MessageRepository {
    private static final String URL = "jdbc:postgresql://localhost:5432/postgres";
    private static final String USER = "d4d-admin";
    private static final String PASSWORD = "d4d1234";

    private static final String CREATE_MESSAGES_TABLE = """
    CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        chat_id INT NOT NULL,
        user_name VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chat_id) REFERENCES chats(id)
    );
""";


    private static final String INSERT_MESSAGE_SQL = """
        INSERT INTO messages (chat_id, user_name, message)
        VALUES (?, ?, ?)
    """;

    private static final String SELECT_MESSAGES_BY_CHAT_SQL = """
        SELECT id, chat_id, user_name, message, created_at
        FROM messages
        WHERE chat_id = ?
        ORDER BY created_at ASC
    """;

    static {
        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             Statement statement = connection.createStatement()) {
            System.out.println("Ensuring messages table exists...");
            statement.execute(CREATE_MESSAGES_TABLE);
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    public static void saveMessage(int chatId, String userName, String message) {
        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement insertStatement = connection.prepareStatement(INSERT_MESSAGE_SQL)) {

            System.out.println("Attempting to save message: " + userName + " - " + message + " in chat: " + chatId);
            insertStatement.setInt(1, chatId);
            insertStatement.setString(2, userName);
            insertStatement.setString(3, message);
            int rowsInserted = insertStatement.executeUpdate();
            System.out.println(rowsInserted + " row(s) inserted successfully!");
        } catch (SQLException e) {
            e.printStackTrace();
            System.out.println("Error occurred while inserting the message.");
        }
    }

    public static List<Message> getMessagesByChat(int chatId) {
        List<Message> messages = new ArrayList<>();
        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement selectStatement = connection.prepareStatement(SELECT_MESSAGES_BY_CHAT_SQL)) {
            selectStatement.setInt(1, chatId);
            try (ResultSet rs = selectStatement.executeQuery()) {
                while (rs.next()) {
                    int id = rs.getInt("id");
                    int cId = rs.getInt("chat_id");
                    String userName = rs.getString("user_name");
                    String message = rs.getString("message");
                    Timestamp createdAt = rs.getTimestamp("created_at");
                    messages.add(new Message(id, cId, userName, message, createdAt.toLocalDateTime()));
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return messages;
    }
}
