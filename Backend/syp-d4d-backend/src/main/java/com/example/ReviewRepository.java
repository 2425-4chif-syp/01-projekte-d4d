package com.example;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class ReviewRepository {
    private static final String URL = "jdbc:postgresql://localhost:5432/postgres";
    private static final String USER = "d4d-admin";
    private static final String PASSWORD = "d4d1234";

    private static final String DROP_TABLES = """
        DROP TABLE IF EXISTS review CASCADE;
        DROP TABLE IF EXISTS servicetype CASCADE;
        DROP TABLE IF EXISTS "user" CASCADE;
    """;

    private static final String CREATE_TABLES = """
        CREATE TABLE IF NOT EXISTS "user" (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE
        );
        
        CREATE TABLE IF NOT EXISTS servicetype (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE
        );
        
        CREATE TABLE IF NOT EXISTS review (
            rating_id SERIAL PRIMARY KEY,
            evaluatee_id INTEGER REFERENCES "user"(id),
            evaluator_id INTEGER REFERENCES "user"(id),
            servicetype_id INTEGER REFERENCES servicetype(id),
            rating DOUBLE PRECISION,
            comment VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """;

    private static final String INSERT_USER_SQL = """
        INSERT INTO "user" (username)
        VALUES (?)
        ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username
        RETURNING id;
    """;

    private static final String GET_USER_SQL = """
        SELECT id FROM "user" WHERE username = ?;
    """;

    private static final String INSERT_SERVICETYPE_SQL = """
        INSERT INTO servicetype (name)
        VALUES (?)
        ON CONFLICT (name) DO NOTHING
        RETURNING id;
    """;

    private static final String INSERT_REVIEW_SQL = """
        INSERT INTO review (evaluatee_id, evaluator_id, servicetype_id, rating, comment)
        VALUES (?, ?, ?, ?, ?)
        RETURNING rating_id;
    """;
    static {
        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             Statement statement = connection.createStatement()) {
            System.out.println("Dropping existing tables...");
            statement.execute(DROP_TABLES);
            System.out.println("Creating fresh tables...");
            statement.execute(CREATE_TABLES);
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    public static List<Review> getAllReviews() {
        List<Review> reviews = new ArrayList<>();
        String query = """
            SELECT 
                u1.username as evaluatee_username,
                u2.username as evaluator_username,
                st.name as service_type,
                r.rating,
                r.comment
            FROM review r
            JOIN "user" u1 ON r.evaluatee_id = u1.id
            JOIN "user" u2 ON r.evaluator_id = u2.id
            JOIN servicetype st ON r.servicetype_id = st.id
        """;

        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement statement = connection.prepareStatement(query)) {

            ResultSet resultSet = statement.executeQuery();
            while (resultSet.next()) {
                Review review = new Review(
                    resultSet.getString("evaluatee_username"),
                    resultSet.getString("evaluator_username"),
                    resultSet.getString("service_type"),
                    resultSet.getDouble("rating"),
                    resultSet.getString("comment")
                );
                reviews.add(review);
            }
        } catch (SQLException e) {
            System.err.println("Fehler beim Laden der Bewertungen: " + e.getMessage());
            e.printStackTrace();
        }

        return reviews;
    }

}
