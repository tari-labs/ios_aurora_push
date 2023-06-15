const express = require('express');
const router = express.Router();
const package_json = require('../package.json');
const tari_crypto = require('tari_chk_sig');

router.get('/', function(req, res, next) {
  res.json({version: package_json.version, tari_crypto: tari_crypto.version(), production: process.env.NODE_ENV == "production"});
});

module.exports = router;
