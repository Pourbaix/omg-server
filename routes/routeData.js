const express = require('express');
const router = express.Router();
const ctrData = require("../controllers/ctrData");
const multer = require('multer');
const upload = multer({dest: 'tmp/csv/'});

// Import CSV data file
router.post('/file', upload.single('file'), ctrData.postFile);

// Retrieve data for chart display
router.get('/chart', ctrData.chart);

// Retrieve an array of the days that contain data
router.get('/days', ctrData.getDataDays);

// Retrieve an array of import names
router.get('/importnames', ctrData.getImportNames);

// Delete data of an import
router.delete('/file', ctrData.deleteFile);

// Delete all data of a user
router.delete('/all', ctrData.deleteAll);

module.exports = router;
