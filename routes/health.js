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

const OK = "0";
const DB_UNREACHABLE = "1";
const CERT_UNREADABLE = "2";

async function healthCheck(_req, res, _next) {
    return db.healthCheck().then(dbResult => {
        if (!dbResult) {
            console.error("Missing DB result");
            return res.send(DB_UNREACHABLE);
        }

        canReadFile(`certs/${process.env.APPLE_CERT_NAME}`).then((success) => {
            if (success) {
                return res.send(OK);
            } else {
                console.error("Failed to read cert");
                return res.send(CERT_UNREADABLE);
            }
        }).catch((error) => {
            console.error("Failed to read cert");
            debug(error);
            return res.send(CERT_UNREADABLE);
        });
    }).catch(err => {
        console.error("DB connection error");
        debug(err);
        return res.status(500).send(DB_UNREACHABLE);
    });
}

module.exports = router;
