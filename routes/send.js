const express = require('express');
const tari_crypto = require('tari_chk_sig');
const debug = require('debug')('aurora_push:routes:send');
const router = express.Router();
const db = require('../lib/database');
const reminders = require('../lib/reminders');

const push_notifications = require("../lib/push_notifications").push_notifications_factory();
const sandbox_push_notifications = require("../lib/push_notifications").sandbox_push_notifications_factory();

const TICKER = process.env.TICKER || "tXTR";
const APP_API_KEY = process.env.APP_API_KEY || "";
const EXPIRES_AFTER_HOURS = process.env.EXPIRE_PUSH_AFTER_HOURS || 24;
const REMINDER_PUSH_NOTIFICATIONS_ENABLED = !!process.env.REMINDER_PUSH_NOTIFICATIONS_ENABLED

router.use('/:to_pub_key', check_signature);
router.post('/:to_pub_key', send);

// Check that the pub key is accompanied by a valid signature.
// signature = from_pub_key + to_pub_key
function check_signature(req, res, next) {
    const to_pub_key = req.params.to_pub_key;
    const { from_pub_key, signature, public_nonce } = req.body;
    const msg = `${APP_API_KEY}${from_pub_key}${to_pub_key}`;
    const check = tari_crypto.check_signature(public_nonce, signature, from_pub_key, msg);

    if (check.result === true) {
        console.log("Valid with new check");
        return next();
    }

    //TODO remove this check after apps have had enough time to update to using the api key
    const check_deprecated = tari_crypto.check_signature(public_nonce, signature, from_pub_key, `${from_pub_key}${to_pub_key}`);
    if (check_deprecated.result === true) {
        console.log("Valid with old check");
        return next();
    }

    res.status(403).json({ error: `Invalid request signature. ${check.error}` });
}

//TODO middleware to throttle senders based on from_pub_key

async function send(req, res, next) {
    const to_pub_key = req.params.to_pub_key;
    const { from_pub_key } = req.body;

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

    //TODO might need additional params for android
    //https://github.com/appfeel/node-pushnotifications#3-send-the-notification
    const payload = {
        title: `You've got ${TICKER}`,
        topic: 'com.tari.wallet',
        body: `Someone just sent you ${TICKER}.`,
        badge: 1,
        pushType: "alert",
        sound: 'ping.aiff',
        mutableContent: true,
        expiry: Math.floor(Date.now() / 1000) + (60 * 60 * EXPIRES_AFTER_HOURS)
    };

    try {
        for (const { token, sandbox } of tokenRows) {
            const service = sandbox ? sandbox_push_notifications : push_notifications;
            const sendResult = await service.send(token, payload);
            if (sendResult[0].success) {
                //Initial send a success, this is the result we'll use independent on whether or not reminders were scheduled successfully
                success = true;
                debug(`Push notification delivered (sandbox=${sandbox})`);
            } else {
                console.error("Push notification failed to deliver.")
                debug(JSON.stringify(sendResult[0]));
                success = false;
            }
        }
    } catch (err) {
        console.error(err);
        success = false;
        error = err;
    }

    if (REMINDER_PUSH_NOTIFICATIONS_ENABLED) {
        try {
            await reminders.schedule_reminders_for_sender(to_pub_key, from_pub_key);
        } catch (error) {
            console.error("Failed to schedule reminder push notifications");
            console.error(error);
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

module.exports = router;
