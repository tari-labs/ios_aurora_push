const express = require('express');
const tari_crypto = require('tari_chk_sig');
const router = express.Router();
const db = require('../lib/database');

const appApiKey = process.env.APP_API_KEY || '';

router.use('/:pubKey', check_pub_key);
router.post('/:pubKey', register);
router.delete('/:pubKey', remove_device);

// Check that the pub key is accompanied by a valid signature.
// signature = pubKey + device token
function check_pub_key(req, res, next) {
    const pubKey = req.params.pubKey || '';
    const { token, signature, public_nonce } = req.body;
    const msg = `${appApiKey}${pubKey}${token}`;
    console.log(msg);

    const check = tari_crypto.check_signature(public_nonce, signature, pubKey, msg);

    if (check.result === true) {
        return next();
    }

    //TODO remove this check after apps have had enough time to update to using the api key
    const check_deprecated = tari_crypto.check_signature(public_nonce, signature, pubKey, `${pubKey}${token}`);
    if (check_deprecated.result === true) {
        console.warn('Using deprecated signature check for register');
        return next();
    }

    res.status(403).json({ error: `Invalid request signature. ${check.error}` });
}

function register(req, res, next) {
    const pubKey = req.params.pubKey;
    const { appId, userId, token, platform, sandbox } = req.body;

    return db
        .register_token({
            pubKey,
            token,
            platform: platform.toLowerCase(),
            appId,
            userId,
            sandbox: Boolean(sandbox)
        })
        .then(() => {
            res.json({ success: true });
        })
        .catch(next);
}

function remove_device(req, res, next) {
    const pubKey = req.params.pubKey;
    const token = req.body.token;

    return db
        .delete_token(pubKey, token)
        .then(() => {
            res.json({ success: true });
        })
        .catch(next);
}

module.exports = router;
