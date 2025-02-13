const express = require('express');
const tari_crypto = require('tari_chk_sig');
const debug = require('debug')('aurora_push:routes:send');
const firebaseRouter = express.Router();
const db = require('../lib/database');
const reminders = require('../lib/reminders');

const sandbox_push_notifications = require('../lib/push_notifications').sandbox_push_notifications_factory();
const firebase_push_notifications = require('../lib/push_notifications_firebase').sendPushNotification;

const APP_API_KEY = process.env.APP_API_KEY || '';
const EXPIRES_AFTER_HOURS = process.env.EXPIRE_PUSH_AFTER_HOURS || 24;
const REMINDER_PUSH_NOTIFICATIONS_ENABLED = !!process.env.REMINDER_PUSH_NOTIFICATIONS_ENABLED;

firebaseRouter.use('/', check_signature);
firebaseRouter.post('/', sendFirebase);

// Check that the pub key is accompanied by a valid signature.
// signature = from_pub_key + to_pub_key
function check_signature(req, res, next) {
    const { from_pub_key, signature, public_nonce, appId, userId } = req.body;
    const msg = `${APP_API_KEY}${from_pub_key}${appId || ''}${userId || ''}`;
    const check = tari_crypto.check_signature(public_nonce, signature, from_pub_key, msg);

    if (check.result === true) {
        return next();
    }

    res.status(403).json({ error: `Invalid request signature. ${check.error}` });
}

async function sendFirebase(req, res, _next) {
    const { to_pub_key, from_pub_key, title, body, topic, appId, userId } = req.body;

    let success;
    let error;
    let tokenRows = [];

    let pubKey = to_pub_key;

    try {
        tokenRows = await db.get_user_token({ appId, userId });
        if (!tokenRows || !Array.isArray(tokenRows) || tokenRows.length === 0) {
            return res.status(404).json({ success: false });
        }
    } catch (error) {
        console.error(`Failed to get device tokens for pub_key ${to_pub_key}`);
        console.error(error);
        return res.status(404).json({ success: false, error: 'Failed to get device tokens' });
    }

    const payload = {
        topic,
        expiry: Math.floor(Date.now() / 1000) + 60 * 60 * EXPIRES_AFTER_HOURS,
        title,
        body
    };

    try {
        success = false;
        for (const { token, sandbox, pub_key } of tokenRows) {
            pubKey = pub_key;
            const service = sandbox ? sandbox_push_notifications : firebase_push_notifications;
            debug(`The send service is (sandbox=${sandbox})`);

            const sendResult = await service(token.trim(), payload);
            debug(`The sendResult of the notification service is ${sendResult}`);
            if (!sendResult) {
                success = false;
                error = 'Failed to send push notification';
                break;
            }
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
