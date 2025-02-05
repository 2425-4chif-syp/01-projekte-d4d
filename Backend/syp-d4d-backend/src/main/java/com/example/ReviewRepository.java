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
}
