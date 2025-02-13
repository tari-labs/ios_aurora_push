const debug = require('debug')('aurora_push:db_pool');
const { Pool } = require('pg');

const useSsl = process.env.PG_SSL === '1' || false;
const pool = new Pool(useSsl ? { ssl: { rejectUnauthorized: false } } : {});

function query(text, params) {
    return pool.query(text, params);
}

/**
 * Checks whether this pub_key has a set push notification token
 * @param string pubKey - The parameters to look up the token
 * @returns {PromiseLike<Array<{token: string, sandbox: boolean}>> | Promise<Array<{token: string, sandbox: boolean}>>}
 */
async function get_user_token(pubKey) {
    debug(`Checking for user with pub_key:${pubKey}`);
    const q = `SELECT token, sandbox, pub_key
               from push_tokens
               WHERE pub_key = $1`;
    const res = await pool.query(q, [pubKey?.toLowerCase()]);
    return res.rows;
}

/**
 * Checks whether this pub_key has a set push notification token
 * @param {Object} params - The parameters to look up the token
 * @param {string} params.appId - The application ID
 * @param {string} params.userId - The user ID
 * @returns {PromiseLike<Array<{token: string, sandbox: boolean}>> | Promise<Array<{token: string, sandbox: boolean}>>}
 */
async function get_user_token_firebase(params) {
    const { appId, userId } = params;
    debug(`Checking for user with appId:${appId} userId:${userId}`);
    const q = `SELECT token, sandbox, pub_key
               from push_tokens
               WHERE app_id = $1 OR user_id = $2`;
    const res = await pool.query(q, [appId, userId]);
    return res.rows;
}

/**
 * Inserts/updates device token and platform for a public key
 * @param {Object} params - The parameters for registering the token
 * @param {string} params.pubKey - The public key associated with the device
 * @param {string} params.token - The device's token
 * @param {string} params.platform - The platform (e.g., iOS, Android)
 * @param {boolean} params.sandbox - Flag to indicate if it's in sandbox mode
 * @param {string} params.appId - The application ID
 * @param {string} params.userId - The user ID
 * @returns {Promise<boolean>} - Returns a promise resolving to a boolean
 */
async function register_token({ pubKey, token, platform, sandbox, appId, userId }) {
    if (!pubKey) {
        throw new Error('pubKey is required');
    }
    if (!token) {
        throw new Error('token is required');
    }

    const q = {
        text: `
      INSERT INTO push_tokens (pub_key, token, platform, sandbox, app_id, user_id, updated_at)
      VALUES($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      ON CONFLICT ON CONSTRAINT index_pub_key_token
      DO UPDATE SET 
        platform = $3,
        sandbox = $4,
        app_id = COALESCE($5, push_tokens.app_id),
        user_id = COALESCE($6, push_tokens.user_id),
        updated_at = CURRENT_TIMESTAMP
    `,
        values: [pubKey.toLowerCase(), token, platform, sandbox, appId, userId]
    };

    debug(`Setting token for ${pubKey}`);
    const res = await pool.query(q.text, q.values);

    if (res.rowCount === 0) {
        throw new Error('Failed to register/update push token');
    }

    return true;
}

/**
 * Remove a pubkey/token pair from the database
 * @param {string} pub_key
 * @param {string} token
 */
async function delete_token(pub_key, token) {
    const q = `DELETE FROM push_tokens WHERE pub_key = $1 AND token = $2`;
    debug(`Removing token ${token.substring(0, 4)}... for ${pub_key}`);
    return pool.query(q, [pub_key.toLowerCase(), token]).then((res) => {
        const success = res.rowCount > 0;
        if (!success) {
            throw `pub_key for token ${token.substring(0, 4)}... not deleted.`;
        }
        return true;
    });
}

/**
 * Inserts reminder notifications for a public key
 * @param pub_key, reminder_type, send_at
 * @returns {PromiseLike<boolean> | Promise<boolean>}
 */
async function schedule_reminder(pub_key, reminder_type, send_at) {
    const q = `
        INSERT INTO reminder_notifications (pub_key, reminder_type, send_at)
        VALUES($1, $2, $3) 
     `;
    debug(`Scheduling ${reminder_type} notification for ${pub_key}`);
    return pool.query(q, [pub_key?.toLowerCase(), reminder_type, send_at]).then((res) => {
        const success = res.rowCount > 0;
        if (!success) {
            throw 'reminder_not_scheduled';
        }

        return true;
    });
}

/**
 * Cancel all future reminders for a pub key
 * @param pub_key
 * @returns {PromiseLike<boolean> | Promise<boolean>}
 */
async function cancel_all_reminders(pub_key) {
    const q = `
        DELETE FROM reminder_notifications
        WHERE pub_key = $1
     `;
    debug(`Removing reminders for ${pub_key}`);
    return pool.query(q, [pub_key.toLowerCase()]).then((_) => {
        return true;
    });
}

/**
 * List all future reminders for a pub key
 * @param pub_key
 * @returns {PromiseLike<boolean> | Promise<boolean>}
 */
async function list_reminders(send_at_before) {
    const q = `
        SELECT id, pub_key, reminder_type, send_at 
        FROM reminder_notifications 
        WHERE send_at < $1`;
    return pool.query(q, [send_at_before]).then((res) => {
        return res.rows;
    });
}

/**
 * Cancel all future reminders for a pub key
 * @param pub_key
 * @returns {PromiseLike<boolean> | Promise<boolean>}
 */
async function delete_reminder(id) {
    const q = `
        DELETE FROM reminder_notifications
        WHERE id = $1
     `;
    return pool.query(q, [id]).then((_) => {
        return true;
    });
}

async function admin_list() {
    const q = `SELECT platform, updated_at from push_tokens`;
    return pool.query(q, []).then((res) => {
        return res.rows;
    });
}

async function healthCheck() {
    const q = `SELECT 1`;
    return pool.query(q, []).then((res) => {
        return res.rowCount > 0;
    });
}

module.exports = {
    query,
    get_user_token,
    get_user_token_firebase,
    register_token,
    delete_token,
    schedule_reminder,
    cancel_all_reminders,
    list_reminders,
    delete_reminder,
    admin_list,
    healthCheck
};
