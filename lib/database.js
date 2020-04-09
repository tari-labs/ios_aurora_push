const debug = require('debug')('aurora_push:db_pool');
const {Pool} = require('pg');
const pool = new Pool();

function query(text, params) {
    return pool.query(text, params);
}

/**
 * Checks whether this pub_key has a set push notification token
 * @param pub_key
 * @returns {PromiseLike<boolean> | Promise<boolean>}
 */
function is_user(pub_key) {
    debug(`Checking for user with pub_key ${pub_key}`);
    const q = `SELECT count(id)
               from push_tokens
               WHERE pub_key = $1`;
    return pool.query(q, [pub_key]).then(res => {
        const count = parseInt(res.rows[0].count);
        debug(`${pub_key} exists`);
        return count > 0;
    });
}

/**
 * Inserts/updates device token and platform for a public key
 * @param pub_key, token, platform
 * @returns {PromiseLike<boolean> | Promise<boolean>}
 */
function register_token(pub_key, token, platform) {
    const q = `
        INSERT INTO push_tokens (pub_key, token, platform, updated_at)
        VALUES($1, $2, $3, CURRENT_TIMESTAMP) 
        ON CONFLICT (pub_key) 
        DO UPDATE SET token = $2, platform = $3, updated_at = CURRENT_TIMESTAMP
     `;
    debug(`Setting token for ${pub_key}`);
    return pool.query(q, [pub_key, token, platform]).then(res => {
        const success = res.rowCount > 0;
        if (!success) {
            throw "pub_key not added/updated.";
        }

        return true
    })
}

function admin_list() {
    const q = `SELECT platform, updated_at from push_tokens`;
    return pool.query(q, []).then(res => {
        return res.rows;
    });
}

module.exports = {
    query,
    register_token,
    admin_list
};
