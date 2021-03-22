const express = require('express');
const router = express.Router();
const ctrTag = require("../controllers/ctrTag");

router.get("/one", (req, res)  => ctrTag.getOne(req, res));

router.post("/one", ((req, res) => ctrTag.postOne(req, res)));

module.exports = router;
