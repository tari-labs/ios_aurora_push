const express = require('express');
const tari_crypto = require('tari_chk_sig');
const router = express.Router();
const db = require('../lib/database');

const appApiKey = process.env.APP_API_KEY || "";

router.use('/:pub_key', check_pub_key);
router.post('/:pub_key', register);
router.delete('/:pub_key', remove_device);

// Check that the pub key is accompanied by a valid signature.
// signature = pub_key + device token
function check_pub_key(req, res, next) {
    const pub_key = req.params.pub_key || "";
    const { token, signature, public_nonce } = req.body;
    const msg = `${appApiKey}${pub_key}${token}`;

    const check = tari_crypto.check_signature(public_nonce, signature, pub_key, msg);

    if (check.result === true) {
        return next();
    }

    //TODO remove this check after apps have had enough time to update to using the api key
    const check_deprecated = tari_crypto.check_signature(public_nonce, signature, pub_key, `${pub_key}${token}`);
    if (check_deprecated.result === true) {
        console.warn("Using deprecated signature check for register");
        return next();
    }

    res.status(403).json({ error: `Invalid request signature. ${check.error}`});
}

function register(req, res, next) {
    const pub_key = req.params.pub_key;
    const token = req.body.token;
    const platform = req.body.platform.toLowerCase();
    const sandbox = !!req.body.sandbox;

    return db.register_token(pub_key, token, platform, sandbox).then(() => {
        res.json({success: true})
    }).catch(next);
}

function remove_device(req, res, next) {
    const pub_key = req.params.pub_key;
    const token = req.body.token;

    return db.delete_token(pub_key, token).then(() => {
        res.json({success: true})
    }).catch(next);
}

module.exports = router;
