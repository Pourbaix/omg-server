const express = require('express');
const router = express.Router();
const ctrData = require("../controllers/ctrData");

// Get one value
router.get("/one", (req, res)  => ctrData.getOne(req, res));

module.exports = router;
