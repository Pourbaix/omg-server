const express = require('express');
const router = express.Router();
const ctrUser = require("../controllers/ctrUser");
const passport = require("../app")

router.post('/register', ctrUser.postRegister);

router.post('/signin', ctrUser.postSignin);

router.get('/logout', passport.authenticate('local-jwt'), ctrUser.logout);

module.exports = router;
