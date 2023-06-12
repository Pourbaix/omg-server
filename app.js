const express = require("express");
const app = express();
const session = require("express-session");
const AutoImportData = require("./models/modelAutoImportData");
const Insulin = require("./models/modelInsulin");
const autoImportData = require("./utils/autoImportData");

require("dotenv").config();

/////////////////////////////////////////////////
// Use helmet to avoid common http security risks
const helmet = require("helmet");
app.use(helmet());
/////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////
// Use ratelimiter to avoid Spamming requests on auth system (brute-force attack)
const rateLimiterMemoryMiddleware = require("./middleware/rateLimiterMemory");
// app.use(rateLimiterMemoryMiddleware);
// Disbaled => Crash when validating a lot of tags (Too many requests at one => Maybe try to send all tag to validate with one route)
/////////////////////////////////////////////////////////////////////////////////

////////////////// Cors //////////////////////////////
const cors = require("cors");
let corsOptions = {
	origin: "*",
	credentials: "true",
};
app.use(cors(corsOptions));
//////////////////////////////////////////////////////

////////////////// Passport //////////////////////////
const passport = require("./config/passport");

// app.use(session({ secret: "test" }));
app.use(session({ secret: process.env.SESSION_SECRET }));
app.use(passport.initialize({ session: false }));
app.use(passport.session({ session: false }));

module.exports = passport;
//////////////////////////////////////////////////////

///////////////// Body-parser ////////////////////////
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ limit: "500mb", extended: true }));
app.use(bodyParser.json({ limit: "500mb", extended: true }));
//////////////////////////////////////////////////////

///////////////// SYNC DB ////////////////////////////
const seq = require("./config/config");
seq.sequelize
	.sync()
	.then(() => {
		// seq.sequelize.query('ALTER TABLE data DROP CONSTRAINT id');
		// seq.sequelize.query('ALTER TABLE data ADD CONSTRAINT pk_user PRIMARY KEY (datetime, userId)');
		console.log("--\nDatabase synchronized\n--");
	})
	.catch((error) =>
		console.log("An error occurred while Synchronization.\n", error)
	);
// AutoImportData.sync({ alter: true });
// // Insulin.drop();
// Insulin.sync({ alter: true });

// seq.sequelize
// 	.query("drop table bolus", {
// 		type: seq.Sequelize.QueryTypes.DROP,
// 	})
// 	.then((result) => {
// 		console.log(result);
// 	});
//////////////////////////////////////////////////////

///////////////// Route modules //////////////////////
const routeUser = require("./routes/routeUser");
const routeTag = require("./routes/routeTag");
const routeData = require("./routes/routeData");
const routeDetectionRanges = require("./routes/routeDetectionRanges");
const routeInsulin = require("./routes/routeInsulin");

app.use("/api/tags", routeTag);
app.use("/api/users", routeUser);
app.use("/api/data", routeData);
app.use("/api/ranges", routeDetectionRanges);
app.use("/api/insulin", routeInsulin);
//////////////////////////////////////////////////////

app.listen(3001);
console.log("App listening on port 3001!");

/////////////////Auto Import//////////////////////////
// Execute the import script every 12 hours //
const cron = require("node-cron");

cron.schedule("0 0 0,12 * * *", () => {
	let date = new Date();
	console.log("--------------------------------------------");
	console.log("Running auto import job! " + date);
	try {
		autoImportData.autoImportAllUsers();
	} catch {
		console.log("Error with while auto-importing with the CRON Job!!");
	}
});

// To test, indiquate a comming minute and see the result:
// cron.schedule(" 33 * * * *", () => {
// 	console.log("Running auto import job!");
// 	autoImportData.autoImportAllUsers();
// });
//////////////////////////////////////////////////////

module.exports = app;
