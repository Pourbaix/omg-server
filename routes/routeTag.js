const express = require('express');
const router = express.Router();
const ctrTag = require("../controllers/ctrTag");

// insert a new tag activation
router.post("/one", ctrTag.postOne);

// Edit one tag activation
router.put("/one", ctrTag.putOne)

// Delete one activation tag
router.delete('/one', ctrTag.deleteOne);

// retrieves all tags
router.get("/all", ctrTag.getNamesFromUserId);

// Retrieve the 8 most recent tags
router.get("/recent", ctrTag.getRecentTagsFromUserId);

// Retrieve the 10 mosts recent tags based on their creation date.
router.get("/recentHistory", ctrTag.getTagsHistory);

router.get("/countAllActivations", ctrTag.getCountAllActivations);

module.exports = router;
