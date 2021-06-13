const express = require('express');
const router = express.Router();
const ctrUser = require("../controllers/ctrUser");

// signup route
router.post('/signup', ctrUser.postSignup);

//signin route
router.post('/signin', ctrUser.postSignin);

// verify validity token route
router.get('/verify', ctrUser.testKey)

module.exports = router;
