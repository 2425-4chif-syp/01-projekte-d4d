-- Tabelle: User
CREATE TABLE "User" (
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

-- Tabelle: ChatEntry
CREATE TABLE ChatEntry (
    chat_ID SERIAL PRIMARY KEY,
    user_ID INT REFERENCES "User"(user_ID) ON DELETE CASCADE,
    message VARCHAR(255),
    time TIMESTAMP
);

-- Tabelle: Review
CREATE TABLE Review (
    rating_ID SERIAL PRIMARY KEY,
    user_ID INT REFERENCES "User"(user_ID) ON DELETE CASCADE,
    rating DOUBLE PRECISION,
    comment VARCHAR(255)
);

-- Tabelle: TypeOfService
CREATE TABLE TypeOfService (
    serviceType_ID SERIAL PRIMARY KEY,
    serviceType VARCHAR(255)
);

-- Tabelle: Service
CREATE TABLE Service (
    service_ID SERIAL PRIMARY KEY,
    offer_ID INT,
    user_ID INT REFERENCES "User"(user_ID) ON DELETE CASCADE,
    serviceType_ID INT REFERENCES TypeOfService(serviceType_ID) ON DELETE CASCADE,
    description VARCHAR(255)
);

-- Tabelle: Market
CREATE TABLE Market (
    offer SERIAL PRIMARY KEY,
    offer_ID INT REFERENCES Service(service_ID) ON DELETE CASCADE
);

