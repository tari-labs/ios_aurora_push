const express = require('express');
const router = express.Router();

router.post('/', cancelReminders);

function cancelReminders(req, res, next) {
    //TODO Dummy endpoint for now so app can be submitted as is
    //TODO message = `${appApikey}cancel-reminders-${pubKeyHex}`
    return res.json({ success: true })
}

module.exports = router;
