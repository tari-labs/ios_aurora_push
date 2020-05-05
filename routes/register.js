const express = require('express');
const tari_crypto = require('tari_crypto');
const debug = require('debug')('aurora_push:routes:keys');
const router = express.Router();
const db = require('../lib/database');

const appApiKey = process.env.APP_API_KEY || "";

router.use('/:pub_key', check_pub_key);
router.post('/:pub_key', register);

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

    return db.register_token(pub_key, token, platform).then(() => {
        res.json({success: true})
    }).catch(err => {
        console.log(JSON.stringify(err));
        res.status(500).json({
            error: err
        });
    });
}

module.exports = router;
