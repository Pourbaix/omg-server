const express = require('express');
const router = express.Router();
const ctrTag = require("../controllers/ctrTag");

router.post("/one", ctrTag.postOne);

router.get("/all", ctrTag.getNamesFromUserId);

module.exports = router;
