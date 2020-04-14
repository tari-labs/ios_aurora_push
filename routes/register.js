const express = require('express');
const tari_crypto = require('tari_crypto');
const debug = require('debug')('aurora_push:routes:keys');
const router = express.Router();
const db = require('../lib/database');

router.use('/:pub_key', check_pub_key);
router.post('/:pub_key', register);

// Check that the pub key is accompanied by a valid signature.
// signature = pub_key + device token
function check_pub_key(req, res, next) {
    const pub_key = req.params.pub_key || "";
    const { token, signature, public_nonce } = req.body;
    const msg = `${pub_key}${token}`;
    const check = tari_crypto.check_signature(public_nonce, signature, pub_key, msg);

    if (check.result === true) {
        return next();
    }
    res.status(403).json({ error: `Invalid request signature. ${check.error}`});
}

function register(req, res, next) {
    //TODO validate input
    const pub_key = req.params.pub_key;
    const token = req.body.token;
    const platform = req.body.platform.toLowerCase();

    return db.register_token(pub_key, token, platform).then(() => {
        res.json({registered: true})
    }).catch(err => {
        console.log(JSON.stringify(err));
        res.status(500).json({
            error: err
        });
    });
}

module.exports = router;
