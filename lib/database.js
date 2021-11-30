const debug = require('debug')('aurora_push:db_pool');
const {Pool} = require('pg');

const useSsl = process.env.PG_SSL === "1" || false;
const pool = new Pool(useSsl ? { ssl: { rejectUnauthorized: false } } : {});

function query(text, params) {
    return pool.query(text, params);
}

/**
 * Checks whether this pub_key has a set push notification token
 * @param pub_key
 * @returns {PromiseLike<boolean> | Promise<boolean>}
 */
function get_user_token(pub_key) {
    debug(`Checking for user with pub_key ${pub_key}`);
    const q = `SELECT token, sandbox
               from push_tokens
               WHERE pub_key = $1`;
    return pool.query(q, [pub_key.toLowerCase()]).then(res => {
        return res.rows[0];
    });
}

/**
 * Inserts/updates device token and platform for a public key
 * @param pub_key, token, platform
 * @returns {PromiseLike<boolean> | Promise<boolean>}
 */
function register_token(pub_key, token, platform, sandbox) {
    const q = `
        INSERT INTO push_tokens (pub_key, token, platform, sandbox, updated_at)
        VALUES($1, $2, $3, $4, CURRENT_TIMESTAMP) 
        ON CONFLICT (pub_key) 
        DO UPDATE SET token = $2, platform = $3, sandbox = $4, updated_at = CURRENT_TIMESTAMP
     `;
    debug(`Setting token for ${pub_key}`);
    return pool.query(q, [pub_key.toLowerCase(), token, platform, sandbox]).then(res => {
        const success = res.rowCount > 0;
        if (!success) {
            throw "pub_key not added/updated.";
        }

        return true
    });
}

/**
 * Inserts reminder notifications for a public key
 * @param pub_key, reminder_type, send_at
 * @returns {PromiseLike<boolean> | Promise<boolean>}
 */
function schedule_reminder(pub_key, reminder_type, send_at) {
    const q = `
        INSERT INTO reminder_notifications (pub_key, reminder_type, send_at)
        VALUES($1, $2, $3) 
     `;
    debug(`Scheduling ${reminder_type} notification for ${pub_key}`);
    return pool.query(q, [pub_key.toLowerCase(), reminder_type, send_at]).then(res => {
        const success = res.rowCount > 0;
        if (!success) {
            throw "reminder_not_scheduled";
        }

        return true
    });
}

/**
 * Cancel all future reminders for a pub key
 * @param pub_key
 * @returns {PromiseLike<boolean> | Promise<boolean>}
 */
function cancel_all_reminders(pub_key) {
    const q = `
        DELETE FROM reminder_notifications
        WHERE pub_key = $1
     `;
    debug(`Removing reminders for ${pub_key}`);
    return pool.query(q, [pub_key.toLowerCase()]).then(res => {
        return true
    });
}

/**
 * List all future reminders for a pub key
 * @param pub_key
 * @returns {PromiseLike<boolean> | Promise<boolean>}
 */
function list_reminders(send_at_before) {
    const q = `
        SELECT id, pub_key, reminder_type, send_at 
        FROM reminder_notifications 
        WHERE send_at < $1`;
    return pool.query(q, [send_at_before]).then(res => {
        return res.rows
    });
}

/**
 * Cancel all future reminders for a pub key
 * @param pub_key
 * @returns {PromiseLike<boolean> | Promise<boolean>}
 */
function delete_reminder(id) {
    const q = `
        DELETE FROM reminder_notifications
        WHERE id = $1
     `;
    return pool.query(q, [id]).then(res => {
        return true
    });
}

function admin_list() {
    const q = `SELECT platform, updated_at from push_tokens`;
    return pool.query(q, []).then(res => {
        return res.rows;
    });
}

function healthCheck() {
    const q = `SELECT 1`;
    return pool.query(q, []).then(res => {
        return res.rowCount > 0;
    });
}

module.exports = {
    query,
    get_user_token,
    register_token,
    schedule_reminder,
    cancel_all_reminders,
    list_reminders,
    delete_reminder,
    admin_list,
    healthCheck
};
