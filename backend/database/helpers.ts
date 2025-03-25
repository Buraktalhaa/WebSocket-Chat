import {pool} from "../config/db.js";

// TO CHECK IF THE CHANNEL EXISTS OR NOT
// Return id value whether it exists or not
export async function checkChannel(channelName:string){
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
    const queryMessage = ('INSERT INTO messages(channel_id , person_id , message_text) VALUES ($1 , $2 , $3) RETURNING message_text , id');
    const valueMessage = [channelId , userId , text];

    const addMessageDb = await pool.query(queryMessage , valueMessage);
    return {messageText: addMessageDb.rows[0].message_text , messageId: addMessageDb.rows[0].id}
}

// Get channel names from database
export async function getChannelList(){
    const channelList:string[] =[];
    const query = ('SELECT channel_name FROM channel');
    const channels = await pool.query(query)
    channels.rows.forEach(channel => {
        channelList.push(channel.channel_name)
    })
    return channelList;
}

// Delete message in database
export async function deleteMessageInDb(value:number){
    try {
        const conditionQuery = 'SELECT created_time FROM messages WHERE id=$1;'
        const conditionValue = [value];
        const result = await pool.query(conditionQuery , conditionValue);

        const createdTime = new Date(result.rows[0].created_time);
        const currentTime = new Date()
        const timeDifference = currentTime.getTime() - createdTime.getTime();
        console.log("Time difference = >" , timeDifference)
        const differenceInMinutes = Math.floor(timeDifference / 60000);
        if (differenceInMinutes < 1) {
            const queryMessage = 'UPDATE messages SET deleted=$2 WHERE id=$1';

            const valueMessage = [value, true]
        
            await pool.query(queryMessage , valueMessage)
            return {command: "Deleted"};
        } else {
            return {command: "Not deleted"};
        }
    } catch (error) {
        console.error(error);
    }
}
            
// Edit the messega in database 
export async function editMessage(editedTextId, editedText) {
    try {

        const query = 'UPDATE messages SET message_text=$2 WHERE id=$1 RETURNING message_text';
        const values = [editedTextId, editedText]; 
        const edited = await pool.query(query, values);

        if (edited.rows.length > 0) { 
            return edited.rows[0].message_text;
        } else {
            return null; 
        }
    } catch (error) {
        console.error(error);
    }
}

// Marks the message as deleted only for the specified user (sender) in the database
export async function deleteForMeDb(messageId , sender){
    try {
        const query = 'UPDATE messages SET deleted_for_users=$1 WHERE id=$2 RETURNING id';
        const value = [JSON.stringify([sender]), messageId]; 

        const deleteInDb = await pool.query(query , value);
        return deleteInDb.rows[0].id;
    } catch (error) {
        return console.error(error);
    }   
}

// Get the ID of the last added channel from the channel table.
export async function lastId(){
    const query = 'SELECT id FROM channel ORDER BY id DESC LIMIT 1';
    const result = await pool.query(query);
    return result.rows[0].id;;
}



// Get old messages in channel
export async function getMessagesForUser(channelId, username) {
    try {
        const query = `
            SELECT 
                messages.id,
                messages.message_text,
                users.person_name
            FROM 
                messages
            JOIN 
                users 
            ON 
                messages.person_id = users.id
            WHERE 
                messages.channel_id = $1
                AND messages.deleted = FALSE
                AND NOT (messages.deleted_for_users @> to_jsonb($2::text));
        `;

        const result = await pool.query(query, [channelId, username]);
        return result.rows; 
    } catch (error) {
        console.error('An error occurred while retrieving data:', error);
    }
}