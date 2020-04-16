const express = require('express');
const router = express.Router();
const debug = require('debug')('aurora_push:routes:health');
const fs = require('fs');
const db = require('../lib/database');

router.get('/', healthCheck);

function canReadFile(targetPath) {
    return new Promise((resolve, reject) => {
        fs.stat(targetPath, (err) => {
            if (err) { reject(err); return; }
            fs.access(targetPath, fs.R_OK, (err) => {
                if (err) {
                    const dir = path.dirname(targetPath);
                    fs.access(dir, fs.R_OK, (err) => {
                        if (err) { reject(err); return; }
                        resolve(false);
                    });
                }

                resolve(true);
            })
        });
    })
}

function healthCheck(req, res, next) {
    return db.healthCheck().then(dbResult => {
        if (dbResult) {
            canReadFile(`certs/${process.env.APPLE_CERT_NAME}`).then((success) => {
                if (success) {
                    return res.send("0")
                } else {
                    console.error("Failed to read cert");
                    return res.send("1")
                }
            }).catch((error) => {
                console.error("Failed to read cert");
                debug(error);
                return res.send("1")
            });
        } else {
            console.error("Missing DB result");
            return res.send("1")
        }
    }).catch(err => {
        console.error("DB connection error");
        debug(err)
        return res.status(500).send("1")
    });
}

module.exports = router;
