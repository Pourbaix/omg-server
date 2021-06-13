const express = require('express');
const router = express.Router();
const ctrData = require("../controllers/ctrData");
const multer = require('multer');
const upload = multer({dest: 'tmp/csv/'});

// Import CSV data file
router.post('/file', upload.single('file'), ctrData.postFile);

// Retrieve data for chart display
router.get('/chart', ctrData.chart)

module.exports = router;
