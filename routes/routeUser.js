const express = require('express');
const router = express.Router();
const ctrUser = require("../controllers/ctrUser");

router.get("/one", (req, res)  => ctrUser.getOne(req, res));

module.exports = router;
