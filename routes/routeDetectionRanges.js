const express = require("express");
const router = express.Router();
const ctrDetectionRanges = require("../controllers/ctrDetectionRanges");

// insert a new range to watch when importing glucose & bolus data
router.post("/one", ctrDetectionRanges.postOne);

// Modify one detection-range
router.put("/one", ctrDetectionRanges.putOne);

// Delete one range
router.delete("/one", ctrDetectionRanges.deleteOneRange);

// Retreives all detection ranges
router.get("/all", ctrDetectionRanges.getAll);

// Recovers all ranges with formated days number
router.get("/times", ctrDetectionRanges.RangesWithFormattedTimes);

// Recovers the number of detection ranges
router.get("/countAll", ctrDetectionRanges.getCountAll);

// NOT IMPLEMENTED
router.get("/detect", ctrDetectionRanges.detectEventInRange);

module.exports = router;
