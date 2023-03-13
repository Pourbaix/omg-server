require("dotenv").config();
// const User = require("./models/modelUser");
const GlocuseData = require("./models/modelGlucoseData");
const Insulin = require("./models/modelInsulin");
const AutoImportData = require("./models/modelAutoImportData");
const careLinkImport = require("./careLinkImport.js");
const ct = require("countries-and-timezones");
const dateUtils = require("./utils/dateUtils.js");

//////////IMPORT SEQUELIZE TO MAKE QUERY//////////////
const seq = require("./config/config");
console.log("seq established");
/////////////////////////////////////////////////////

async function autoImport(userId) {
	console.log("Executing Auto Import for user: " + userId);
	if (!userId) {
		return -1;
	}
	let userInfo = await AutoImportData.findOne({
		where: { userId: userId },
	}).catch((err) => {
		return err;
	});

	let data = await careLinkImport.getLast24DataObject(
		userInfo.dataValues.medtronicUser,
		userInfo.dataValues.medtronicPassword,
		userInfo.dataValues.country
	);

	let lastDataImportedFormated = dateUtils.normalizedUTC(
		new Date(userInfo.lastDataUpdate).getTime()
	);
	console.log(lastDataImportedFormated);
	let glucoseData = data["sgs"];
	let insulinData = data["markers"];
	let insulinFilter = ["INSULIN", "AUTO_BASAL_DELIVERY", "MEAL"];
	let pumpSerial = data["medicalDeviceSerialNumber"];
	let importName = "AUTO-IMPORTED";
	let lastDatetimeImport = userInfo.lastDataUpdate;

	// console.log(insulinData);
	for (let e in insulinData) {
		let existCheck = await Insulin.findOne({
			where: {
				datetime: dateUtils.toNormalizedUTCISOStringWithCountry(
					userInfo.dataValues.country,
					insulinData[e].dateTime
				),
				insulinType: insulinData[e]["type"],
			},
		});
		if (existCheck) {
			// console.log("Already exist!");
		} else {
			if (insulinData[e].dateTime) {
				let additionnalData = {};
				if (insulinData[e]["type"] == insulinFilter[0]) {
					// type = "INSULIN"
					additionnalData = {
						activationType: insulinData[e].activationType,
						programmedFastAmount:
							insulinData[e].programmedFastAmount,
						programmedDuration: insulinData[e].programmedDuration,
						deliveredFastAmount: insulinData[e].deliveredFastAmount,
						bolusType: insulinData[e].bolusType,
					};
					Insulin.create({
						datetime: dateUtils.toNormalizedUTCISOStringWithCountry(
							userInfo.dataValues.country,
							insulinData[e].dateTime
						),
						carbInput: 0,
						userId: userId,
						insulinType: "CORRECTION",
						insulinDescr: JSON.stringify(additionnalData),
					}).catch((e) => {
						console.log(e);
					});
				} else if (insulinData[e]["type"] == insulinFilter[1]) {
					// type = "AUTO_BASAL_DELIVERY"
					additionnalData = {
						bolusAmount: insulinData[e].bolusAmount,
					};
					Insulin.create({
						datetime: dateUtils.toNormalizedUTCISOStringWithCountry(
							userInfo.dataValues.country,
							insulinData[e].dateTime
						),
						carbInput: 0,
						userId: userId,
						insulinType: insulinFilter[1],
						insulinDescr: JSON.stringify(additionnalData),
					}).catch((e) => {
						console.log(e);
					});
				} else if (insulinData[e]["type"] == insulinFilter[2]) {
					// type = "MEAL"
					Insulin.create({
						datetime: dateUtils.toNormalizedUTCISOStringWithCountry(
							userInfo.dataValues.country,
							insulinData[e].dateTime
						),
						carbInput: insulinData[e].amount,
						userId: userId,
						insulinType: insulinFilter[2],
						insulinDescr: null,
					}).catch((e) => {
						console.log(e);
					});
				}
			}
		}
	}
	for (let i in glucoseData) {
		if (glucoseData[i].datetime && parseInt(glucoseData[i].sg) != 0) {
			let formatedDate = dateUtils.normalizeUTCWithCountry(
				userInfo.dataValues.country,
				dateUtils.normalizedUTC(
					new Date(glucoseData[i].datetime).getTime()
				)
			);
			if (formatedDate > lastDataImportedFormated) {
				GlocuseData.create({
					datetime: dateUtils.toNormalizedUTCISOStringWithCountry(
						userInfo.dataValues.country,
						glucoseData[i].datetime
					),
					glucose: parseInt(glucoseData[i].sg),
					pumpSN: pumpSerial,
					importName: importName,
					userId: userId,
				}).catch((e) => {
					console.log(e);
				});
				lastDatetimeImport =
					dateUtils.toNormalizedUTCISOStringWithCountry(
						userInfo.dataValues.country,
						glucoseData[i].datetime
					);
			}
		}
	}

	// console.log(lastDatetimeImport);
	AutoImportData.update(
		{ lastDataUpdate: lastDatetimeImport },
		{ where: { userId: userId } }
	)
		.catch((err) => {
			return err;
		})
		.then(() => {
			return 1;
		});

	/////////////CLOSE SEQ CONNECTION////////////////////
	// await seq.sequelize.close();
	/////////////////////////////////////////////////////
}
async function autoImportAllUsers() {
	let userList = await AutoImportData.findAll({ attributes: ["userId"] });
	// console.log(userList);
	for (let item in userList) {
		// console.log(item);
		console.log("userId n°: " + userList[item].dataValues.userId);
		await autoImport(userList[item].dataValues.userId).catch((err) => {
			return err;
		});
	}
	return 1;
}
// autoImportAllUsers();

module.exports = {
	autoImport,
	autoImportAllUsers,
};
