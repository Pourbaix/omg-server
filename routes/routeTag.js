const express = require("express");
const router = express.Router();
const ctrTag = require("../controllers/ctrTag");

// insert a new tag activation
router.post("/one", ctrTag.postOne);

router.post("/pending", ctrTag.postPending);

router.get("/pending", ctrTag.getPendingTags);

// Edit one tag activation
router.put("/one", ctrTag.putOne);

// Delete one activation tag
router.delete("/one", ctrTag.deleteOne);

// retrieves all tag activations
router.get("/all", ctrTag.getNamesFromUserId);

// Change all tag activation name which have the same name that tagName
router.put("/all", ctrTag.putAll);

// delete all tags
router.delete("/all", ctrTag.deleteAll);

// Retrieve the 8 most recent distinct tags
router.get("/recent", ctrTag.getRecentTagsFromUserId);

// Retrieve the 10 mosts recent tags based on their activation date.
router.get("/recentHistorySorted", ctrTag.getTagsHistoryByActivationTime);

// Retrieve the 10 mosts recent tags based on their creation date.
router.get("/recentHistory", ctrTag.getTagsHistory);

router.get("/countAllActivations", ctrTag.getCountAllActivations);

// Retrieve an array of days that contain tag activations
router.get("/days", ctrTag.getTagsDays);

// Retrieve an array of tags at a specific day
router.get("/day", ctrTag.getTagsDay);

// Retrieve all tags that are not associated with data
router.get("/withNoData", ctrTag.getTagsWithoutData);

module.exports = router;
