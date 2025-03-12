INSERT INTO channel (channel_name) VALUES 
    ('Chat'),
    ('Game');

INSERT INTO users(person_name) VALUES
    ('Burak'),
    ('Feyza'),
    ('Talha');


INSERT INTO messages (channel_id, person_id, message_text) VALUES  
    (1, 1, 'Hello everyone'),
    (1, 1, 'Hi'),
    (2, 1, 'Heyyy'),
    (2, 2, 'What’s the last game you played?'), 
    (2, 3, 'Is anyone playing CS:GO?');




-- psql -U postgres -d chat_app -f insert_data.sql    