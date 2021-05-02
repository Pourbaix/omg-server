const express = require('express');
const router = express.Router();
const ctrUser = require("../controllers/ctrUser");
const passport = require("../app")

router.post('/register', ctrUser.postRegister);

router.post('/signin', ctrUser.postSignin);

router.get('/verify', ctrUser.testKey)

module.exports = router;
