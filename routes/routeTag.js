const express = require('express');
const router = express.Router();
const ctrTag = require("../controllers/ctrTag");

// insert a new tag activation
router.post("/one", ctrTag.postOne);

// retrieves all tags
router.get("/all", ctrTag.getNamesFromUserId);

// Retrieve the 8 most recent tags
router.get("/recent", ctrTag.getRecentTagsFromUserId);

module.exports = router;
