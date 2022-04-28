const express = require('express');
const router = express.Router();
const ctrDetectionRanges = require("../controllers/ctrDetectionRanges");

// insert a new range to watch when importing glucose & bolus data
router.post("/one", ctrDetectionRanges.postOne);

// Delete one range
router.delete('/one', ctrDetectionRanges.deleteOneRange);

router.get("/all", ctrDetectionRanges.getAll);

router.get("/times", ctrDetectionRanges.RangesWithFormattedTimes);

router.get("/countAll", ctrDetectionRanges.getCountAll);

router.get("/detect", ctrDetectionRanges.detectEventInRange);

module.exports = router;
