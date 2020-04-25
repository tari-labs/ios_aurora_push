const express = require('express');
const debug = require('debug')('aurora_push:routes:cancel_reminders');
const router = express.Router();
const db = require('../lib/database');

router.post('/', cancelReminders);

function cancelReminders(req, res, next) {
    //TODO Dummy endpoint for now so app can be submitted as is
    //TODO message = cancel-transactions-\(pubKeyHex)
    return res.json({ cancelled: true })
}

module.exports = router;
