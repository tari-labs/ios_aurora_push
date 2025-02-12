const express = require('express');
const router = express.Router();
const db = require('../lib/database');

router.use(simple_auth);
router.get('/list', list);
// router.get('/list-reminders', list_reminders);

function simple_auth(req, res, next) {
    let token = req.query.token || "invalid";
    if (token !== process.env.ADMIN_TOKEN) {
        return res.status(500).json({
            error: "Unauthorized access"
        });
    }
    return next();
}

function list(_, res, next) {
    return db.admin_list().then(rows => {
        return res.json(rows)
    }).catch(next);
}

// function list_reminders(req, res, next) {
//     return db.list_reminders(new Date().addHours(24*365)).then(rows => {
//         return res.json(rows)
//     }).catch(error => {
//         return res.status(500).json({ error });
//     });
// }

module.exports = router;
