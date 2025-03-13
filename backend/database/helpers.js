import {pool} from "../config.js";

// TO CHECK IF THE CHANNEL EXISTS OR NOT
// Return id value whether it exists or not
export async function checkChannel(channelName){
    const query = ('SELECT * FROM channel where channel_name = $1 LIMIT 1')
    const value = [channelName];

    const result = await pool.query(query , value)
    
    if(result.rows.length > 0){
        console.log('Channel exists in database.')
        return result.rows[0].id;
    }
    else{
        const addQuery = ('INSERT INTO channel (channel_name) VALUES ($1) RETURNING id');
        const addValue = [channelName];
        const addDb = await pool.query(addQuery , addValue);
        console.log('Channel has been created in the database.')
        return addDb.rows[0].id;
    }
}


// TO CHECK IF THE USER EXISTS OR NOT
// Return id value whether it exists or not
export async function checkPerson(personName) {

    const checkNameQuery = ('SELECT * FROM users WHERE person_name = $1');
    const checkNameValue = [personName];
    const addDbPerson = await pool.query(checkNameQuery , checkNameValue);

    // If it doesn't exist, add it to the database.
    if(addDbPerson.rows.length < 1){
        const addUserQuery = ('INSERT INTO users (person_name) VALUES ($1) RETURNING id');
        const addUserValue = [personName]; 

        const addUserDb = await pool.query(addUserQuery , addUserValue);
        console.log(`User = ${personName}, created.`) 
        return addUserDb.rows[0].id;
    }
    else{
        console.log("The user exists in the database.")
        return addDbPerson.rows[0].id;
    }
}


// Place to add messages to database
export async function addMessagesToDb(channelId , userId , text){
    const queryMessage = ('INSERT INTO messages(channel_id , person_id , message_text) VALUES ($1 , $2 , $3) RETURNING message_text');
    const valueMessage = [channelId , userId , text];

    const addMessageDb = await pool.query(queryMessage , valueMessage);
    return addMessageDb.rows[0].message_text;
}