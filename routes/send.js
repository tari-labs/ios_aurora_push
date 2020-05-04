const express = require('express');
const tari_crypto = require('tari_crypto');
const PushNotifications = require('node-pushnotifications');
const debug = require('debug')('aurora_push:routes:send');
const router = express.Router();
const db = require('../lib/database');

const ticker = process.env.TICKER || "tXTR";
const appApiKey = process.env.APP_API_KEY || "";
const expiresAfterHours = process.env.EXPIRE_PUSH_AFTER_HOURS || 24;
const production = process.env.NODE_ENV == "production";
if (!production) {
    console.warn("*** Running in sandbox mode. If prod required use 'export NODE_ENV=production'")
}

const pushNotifications = new PushNotifications({
    apn: {
        token: {
            key: `certs/${process.env.APPLE_CERT_NAME}`,
            keyId: process.env.APPLE_KEY_ID,
            teamId: process.env.APPLE_TEAM_ID,
        },
        production
    }
    //TODO Add config for google services
    //https://github.com/appfeel/node-pushnotifications#1-import-and-setup-push-module
});

router.use('/:to_pub_key', check_signature);
router.post('/:to_pub_key', send);

// Check that the pub key is accompanied by a valid signature.
// signature = from_pub_key + to_pub_key
function check_signature(req, res, next) {
    const to_pub_key = req.params.to_pub_key;
    const { from_pub_key, signature, public_nonce } = req.body;
    const msg = `${appApiKey}${from_pub_key}${to_pub_key}`;
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

    res.status(403).json({ error: `Invalid request signature. ${check.error}`});
}

//TODO middleware to throttle senders based on from_pub_key

function send(req, res, next) {
    const to_pub_key = req.params.to_pub_key;

    return db.get_user_token(to_pub_key).then((result) => {
        const token = result ? result.token : null;
        if (!token) {
            res.status(404).json({
                success: false,
                error: "User not registered for push notifications"
            });
            return
        }

        //TODO might need additional params for android
        //https://github.com/appfeel/node-pushnotifications#3-send-the-notification
        const payload = {
            title: `You've got ${ticker}`,
            topic: 'com.tari.wallet',
            body: `Someone just sent you ${ticker}.`,
            badge: 1,
            pushType: "alert",
            sound: 'ping.aiff',
            expiry: Math.floor(Date.now() / 1000) + (60 * 60 * expiresAfterHours)
        };

        pushNotifications.send(token, payload)
            .then((results) => {
                if (results[0].success) {
                    debug("Push notification delivered");
                    res.json({ success: true })
                } else {
                    debug("Push notification failed to deliver");
                    debug(JSON.stringify(results[0]));
                    res.json({ success: false })
                }
            })
            .catch((err) => {
                debug("Push request failed");
                debug(JSON.stringify(err));
                res.json({success: false})
            });
    }).catch(err => {
        debug(err);
        res.status(500).json({
            success: false,
            error: err
        });
    });
}

module.exports = router;
