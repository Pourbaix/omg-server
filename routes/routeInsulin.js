const express = require("express");
const router = express.Router();
const ctrInsulin = require("../controllers/ctrInsulin");

router.get("/dateandtime", ctrInsulin.getBolusWithFormattedDateAndTime);

module.exports = router;
