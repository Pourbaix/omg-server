const express = require('express');
const router = express.Router();
const ctrBolus = require("../controllers/ctrBolus");

router.get("/dateandtime", ctrBolus.getBolusWithFormattedDateAndTime);

module.exports = router;
