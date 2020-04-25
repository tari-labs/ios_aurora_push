const express = require('express');
const router = express.Router();
const db = require('../lib/database');

router.use(simple_auth);
router.get('/list', list);

function simple_auth(req, res, next) {
    let token = req.query.token || "invalid";
    if (token !== process.env.ADMIN_TOKEN) {
        return res.status(500).json({
            error: "Unauthorized access"
        });
    }
    return next();
}

//TODO after testing remove this endpoint
function list(req, res, next) {
    return db.admin_list().then(rows => {
        return res.json(rows)
    }).catch(err => {
        res.status(500).json({
            error: err
        });
    });
}

module.exports = router;
