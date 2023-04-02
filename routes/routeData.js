const express = require("express");
const router = express.Router();
const ctrData = require("../controllers/ctrData");
const multer = require("multer");
const upload = multer({ dest: "tmp/csv/" });

// Import CSV data file
router.post("/file", upload.single("file"), ctrData.postFile);

// Add autoImport account configuration
router.post("/autoImportAccount", ctrData.addAutoImportAccountData);

// Get last 24h data to display on chart
router.get("/lastXhData", ctrData.getDataByHour);

// Import the data from the carelink server
router.get("/autoImportData", ctrData.autoImportData);

// Check if user configured autoImport
router.get("/autoImportConfiguration", ctrData.checkAutoImportConfiguration);

// Retrieve data for chart display
router.get("/chart", ctrData.chart);

// Retrieve an array of the days from data
router.get("/days", ctrData.getDataDays);

// Retrieve an array of the datetime from data
router.get("/datetime", ctrData.getDataDatetime);

// Retrieve an array of import names
router.get("/importnames", ctrData.getImportNames);

// Delete data of an import
router.delete("/file", ctrData.deleteFile);

// Delete all data of a user
router.delete("/all", ctrData.deleteAll);

// Delete an auto-import configuration for a given user
router.delete(
	"/deleteAutoImportConfiguration",
	ctrData.deleteAutoImportConfiguration
);

module.exports = router;
