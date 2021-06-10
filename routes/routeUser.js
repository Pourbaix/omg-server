const express = require('express');
const router = express.Router();
const ctrUser = require("../controllers/ctrUser");

router.post('/signup', ctrUser.postSignup);

router.post('/signin', ctrUser.postSignin);

router.get('/verify', ctrUser.testKey)

module.exports = router;
