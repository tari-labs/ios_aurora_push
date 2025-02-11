const express = require('express');
const tari_crypto = require('tari_chk_sig');
const debug = require('debug')('aurora_push:routes:send');
const firebaseRouter = express.Router();
const db = require('../lib/database');
const reminders = require('../lib/reminders');

const sandbox_push_notifications = require('../lib/push_notifications').sandbox_push_notifications_factory();
const firebase_push_notifications = require('../lib/push_notifications_firebase').sendPushNotification;

firebaseRouter.use(':to_pub_key', check_signature);
firebaseRouter.post(':to_pub_key', sendFirebase);

// Check that the pub key is accompanied by a valid signature.
// signature = from_pub_key + to_pub_key
function check_signature(req, res, next) {
    const to_pub_key = req.params.to_pub_key;
    const { from_pub_key, signature, public_nonce } = req.body;
    const msg = `${APP_API_KEY}${from_pub_key}${to_pub_key}`;
    const check = tari_crypto.check_signature(public_nonce, signature, from_pub_key, msg);

    if (check.result === true) {
        console.log('Valid with new check');
        return next();
    }

    //TODO remove this check after apps have had enough time to update to using the api key
    const check_deprecated = tari_crypto.check_signature(
        public_nonce,
        signature,
        from_pub_key,
        `${from_pub_key}${to_pub_key}`
    );
    if (check_deprecated.result === true) {
        console.log('Valid with old check');
        return next();
    }

    res.status(403).json({ error: `Invalid request signature. ${check.error}` });
}

async function sendFirebase(req, res, _next) {
    const to_pub_key = req.params.to_pub_key;
    const { from_pub_key, title, body, topic } = req.body;

    let success;
    let error;
    let tokenRows = [];

    try {
        tokenRows = await db.get_user_token(to_pub_key);
        if (!tokenRows && Array.isArray(tokenRows) && tokenRows.length === 0) {
            return res.status(404).json({ success: false });
        }
    } catch (error) {
        console.error(`Failed to get device tokens for pub_key ${to_pub_key}`);
        console.error(error);
    }

    const payload = {
        topic,
        expiry: Math.floor(Date.now() / 1000) + 60 * 60 * EXPIRES_AFTER_HOURS,
        title,
        body
    };

    try {
        for (const { token, sandbox } of tokenRows) {
            const service = sandbox ? sandbox_push_notifications : firebase_push_notifications;
            debug(`The send service is (sandbox=${sandbox})`);

            const sendResult = await service(token.trim(), payload);
            debug(`The sendResult of the notification service is ${sendResult}`);
            success = true;
        }
    } catch (err) {
        console.log(`Error thrown from general try/catch ${err.message} : ${err}`);
        success = false;
        error = err;
    }

    if (REMINDER_PUSH_NOTIFICATIONS_ENABLED) {
        try {
            await reminders.schedule_reminders_for_sender(to_pub_key, from_pub_key);
        } catch (error) {
            debug('Failed to schedule reminder push notifications');
            debug(error);
        }
    }

    if (!success) {
        console.error(error);
        return res.status(500).json({
            success: false,
            error
        });
    }

    return res.json({ success: !!success });
}

module.exports = firebaseRouter;
