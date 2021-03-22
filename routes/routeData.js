const express = require('express');
const router = express.Router();
const ctrData = require("../controllers/ctrData");
const multer  = require('multer');
const upload = multer({dest: 'tmp/csv/'});

// Get one value
router.get('/one', (req, res)  => ctrData.getOne(req, res));
// Upload file
router.post('/file', upload.single('file'), (req, res) => ctrData.postFile(req, res));

module.exports = router;
