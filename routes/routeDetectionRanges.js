const express = require('express');
const router = express.Router();
const ctrDetectionRanges = require("../controllers/ctrDetectionRanges");

// insert a new range to watch when importing glucose & bolus data
router.post("/one", ctrDetectionRanges.postOne);



module.exports = router;
