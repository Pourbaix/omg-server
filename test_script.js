require("dotenv").config();
const mariadb = require("mariadb/callback");
const { Sequelize } = require("sequelize");
const seq = require("./config/config");

// Dont delete even if unused cause it make sequelize realize thta they exist
const User = require("./models/modelUser");
const AutoImportData = require("./models/modelAutoImportData");
const Insulin = require("./models/modelInsulin");
const DetectionRanges = require("./models/modelDetectionRanges");
const Glucose = require("./models/modelGlucoseData");
const Tag = require("./models/modelTag");

// A script to clear the test database each time test suite runs
seq.sequelize.drop();
seq.sequelize.sync({ force: true });

return 1;

////////////////////////////////////////////
// !!!!!!!!!!!! DON'T DELETE !!!!!!!!!!!!!!!
////////////////////////////////////////////
