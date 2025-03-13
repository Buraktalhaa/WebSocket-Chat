CREATE DATABASE chat_app;

\c chat_app;

CREATE TABLE channel(
    id SERIAL PRIMARY KEY,
    channel_name VARCHAR(50) NOT NULL
);

CREATE TABLE users(
    id SERIAL PRIMARY KEY,
    person_name VARCHAR(50) NOT NULL
);

CREATE TABLE messages(
    id SERIAL PRIMARY KEY,
    channel_id INTEGER REFERENCES channel(id) ON DELETE CASCADE,
    person_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message_text TEXT,
    created_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



-- psql -U postgres -f database.sql

-- delete database
-- psql -U postgres -c "DROP DATABASE IF EXISTS chat_app;"

-- Kullanicilari sonlandir
-- psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'chat_app';"
