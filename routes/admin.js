const express = require('express');
const router = express.Router();
const db = require('../lib/database');
const reminders = require('../lib/reminders');

router.use(simple_auth);
router.get('/list', list);
router.get('/list-reminders', list_reminders);
router.get('/test-reminders', test_reminders);

function simple_auth(req, res, next) {
    let token = req.query.token || "invalid";
    if (token !== process.env.ADMIN_TOKEN) {
        return res.status(500).json({
            error: "Unauthorized access"
        });
    }
    return next();
}

function list(req, res, next) {
    return db.admin_list().then(rows => {
        return res.json(rows)
    }).catch(error => {
        return res.status(500).json({ error });
    });
}

function list_reminders(req, res, next) {
    return db.list_reminders(new Date().addHours(24*365)).then(rows => {
        return res.json(rows)
    }).catch(error => {
        return res.status(500).json({ error });
    });
}

// http://localhost:3000/super-duper-only/test-reminders?token=auth123&recipient_pub_key=1a62637409aca2ee361003b865425b2e1d5adb7ae62dd87dc5cd1933f4a9ee79&sender_pub_key=48d04e73adb202fcc48f1664d3231a699ed327f6bde2f66648aa2c10f5602e41
//TODO remove me
async function test_reminders(req, res, next) {
    let recipient_pub_key = req.query.recipient_pub_key;
    let sender_pub_key = req.query.sender_pub_key;

    try {
        // await db.cancel_all_reminders(recipient_pub_key);
        // await db.cancel_all_reminders(sender_pub_key);

        await reminders.schedule_reminders_for_sender(recipient_pub_key, sender_pub_key);
    } catch (error) {
        return res.status(500).json({ error });
    }

    return res.json({recipient_pub_key, sender_pub_key });
}

module.exports = router;
