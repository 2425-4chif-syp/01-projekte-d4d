package at.htl.d4d.control;

import at.htl.d4d.entity.Review;

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

    public static List<Review> getReviewsByUsername(String username) {
        List<Review> reviews = new ArrayList<>();
        String query = "SELECT evaluatee_username, evaluator_username, service_type, rating, comment, created_at FROM review WHERE evaluatee_username = ? AND deleted_at IS NULL";

        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement statement = connection.prepareStatement(query)) {

            statement.setString(1, username);
            ResultSet resultSet = statement.executeQuery();

            while (resultSet.next()) {
                Review review = new Review(
                    resultSet.getString("evaluatee_username"),
                    resultSet.getString("evaluator_username"),
                    resultSet.getString("service_type"),
                    resultSet.getDouble("rating"),
                    resultSet.getString("comment")
                );
                review.setCreatedAt(resultSet.getTimestamp("created_at").toLocalDateTime());
                reviews.add(review);
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }

        return reviews;
    }

    public static void addReview(Review review) {
        System.out.println("Starte Speicherung der Bewertung...");
        System.out.println("Bewertungsdaten:");
        System.out.println("- Evaluatee: " + review.getEvaluateeUsername());
        System.out.println("- Evaluator: " + review.getEvaluatorUsername());
        System.out.println("- Service Type: " + review.getServiceType());
        System.out.println("- Rating: " + review.getRating());
        System.out.println("- Comment: " + review.getComment());

        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD)) {
            connection.setAutoCommit(false);  // Transaktion starten
            try {
                // Insert evaluatee
                int evaluateeId;
                try (PreparedStatement ps = connection.prepareStatement(INSERT_USER_SQL)) {
                    ps.setString(1, review.getEvaluateeUsername());
                    ResultSet rs = ps.executeQuery();
                    if (!rs.next()) {
                        throw new SQLException("Could not create or find evaluatee user");
                    }
                    evaluateeId = rs.getInt("id");
                    System.out.println("Evaluatee ID: " + evaluateeId);
                }

                // Insert evaluator
                int evaluatorId;
                try (PreparedStatement ps = connection.prepareStatement(INSERT_USER_SQL)) {
                    ps.setString(1, review.getEvaluatorUsername());
                    ResultSet rs = ps.executeQuery();
                    if (!rs.next()) {
                        throw new SQLException("Could not create or find evaluator user");
                    }
                    evaluatorId = rs.getInt("id");
                    System.out.println("Evaluator ID: " + evaluatorId);
                }

                // Insert service type
                int serviceTypeId;
                try (PreparedStatement ps = connection.prepareStatement(INSERT_SERVICETYPE_SQL)) {
                    ps.setString(1, review.getServiceType());
                    ResultSet rs = ps.executeQuery();
                    if (rs.next()) {
                        serviceTypeId = rs.getInt("id");
                        System.out.println("Service Type ID (neu): " + serviceTypeId);
                    } else {
                        // If no id returned, service type already existed, get its id
                        try (PreparedStatement getPs = connection.prepareStatement("SELECT id FROM servicetype WHERE name = ?")) {
                            getPs.setString(1, review.getServiceType());
                            ResultSet getRs = getPs.executeQuery();
                            if (!getRs.next()) {
                                throw new SQLException("Could not find or create service type");
                            }
                            serviceTypeId = getRs.getInt("id");
                            System.out.println("Service Type ID (existierend): " + serviceTypeId);
                        }
                    }
                }

                // Insert the review
                try (PreparedStatement ps = connection.prepareStatement(INSERT_REVIEW_SQL)) {
                    ps.setInt(1, evaluateeId);
                    ps.setInt(2, evaluatorId);
                    ps.setInt(3, serviceTypeId);
                    ps.setDouble(4, review.getRating());
                    ps.setString(5, review.getComment());

                    ResultSet rs = ps.executeQuery();
                    if (rs.next()) {
                        int reviewId = rs.getInt("rating_id");
                        System.out.println("Bewertung erfolgreich gespeichert mit ID: " + reviewId);
                        connection.commit();  // Transaktion bestätigen
                    } else {
                        throw new SQLException("Bewertung konnte nicht gespeichert werden");
                    }
                }
            } catch (SQLException e) {
                System.err.println("Fehler während der Transaktion: " + e.getMessage());
                connection.rollback();  // Bei Fehler Transaktion zurückrollen
                throw e;
            }
        } catch (SQLException e) {
            System.err.println("SQL Fehler beim Speichern der Bewertung:");
            System.err.println("SQL State: " + e.getSQLState());
            System.err.println("Error Code: " + e.getErrorCode());
            System.err.println("Message: " + e.getMessage());
            e.printStackTrace();
            throw new jakarta.ws.rs.WebApplicationException("Review creation failed: " + e.getMessage(), e);
        }
    }

    public static Double getAverageRating(String username) {
        String query = "SELECT AVG(rating) as avg_rating FROM review WHERE evaluatee_username = ? AND deleted_at IS NULL";
        
        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement statement = connection.prepareStatement(query)) {

            statement.setString(1, username);
            ResultSet resultSet = statement.executeQuery();

            if (resultSet.next()) {
                return resultSet.getDouble("avg_rating");
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }

        return 0.0;
    }

}
