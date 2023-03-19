require("dotenv").config();
// const User = require("./models/modelUser");
const GlocuseData = require("../models/modelGlucoseData");
const Insulin = require("../models/modelInsulin");
const AutoImportData = require("../models/modelAutoImportData");
const careLinkImport = require("./careLinkImport.js");
const dateUtils = require("./dateUtils.js");

//////////IMPORT SEQUELIZE TO MAKE QUERY//////////////
const seq = require("../config/config");
const GlucoseData = require("../models/modelGlucoseData");
const { Op } = require("sequelize");
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

	// let lastDataImportedFormated = dateUtils.normalizedUTC(
	// 	new Date(userInfo.lastDataUpdate).getTime()
	// );
	// // console.log(lastDataImportedFormated);
	let glucoseData = data["sgs"];
	let insulinData = data["markers"];
	let insulinFilter = ["INSULIN", "AUTO_BASAL_DELIVERY", "MEAL"];
	let pumpSerial = data["medicalDeviceSerialNumber"];
	let importName = "AUTO-IMPORTED";
	let lastDatetimeImport = userInfo.lastDataUpdate;

	let lastInsulinData = await getLast24HData(0, userId);
	for (let e in insulinData) {
		if (insulinData[e].dateTime) {
			let existCheck = lastInsulinData.filter((x) => {
				let tempDate = new Date();
				tempDate.setTime(x.datetime.getTime());
				let type = "";
				insulinData[e]["type"] == "INSULIN"
					? (type = "CORRECTION")
					: (type = insulinData[e]["type"]);
				return (
					tempDate.toISOString() ==
						dateUtils.toNormalizedUTCISOStringWithCountry(
							userInfo.dataValues.country,
							dateUtils.ISOTo5Minutes(insulinData[e].dateTime)
						) &&
					x.insulinType == type &&
					x.insulinDescr == buildAdditionnalData(insulinData[e])
				);
			});
			if (!existCheck.length) {
				let additionnalData = {};
				if (insulinData[e]["type"] == insulinFilter[0]) {
					// type = "INSULIN" (CORRECTION)
					// additionnalData = {
					// 	activationType: insulinData[e].activationType,
					// 	programmedFastAmount:
					// 		insulinData[e].programmedFastAmount,
					// 	programmedDuration: insulinData[e].programmedDuration,
					// 	deliveredFastAmount: insulinData[e].deliveredFastAmount,
					// 	bolusType: insulinData[e].bolusType,
					// };
					additionnalData = buildAdditionnalData(insulinData[e]);
					Insulin.create({
						datetime: dateUtils.toNormalizedUTCISOStringWithCountry(
							userInfo.dataValues.country,
							dateUtils.ISOTo5Minutes(insulinData[e].dateTime)
						),
						carbInput: 0,
						userId: userId,
						insulinType: "CORRECTION",
						insulinDescr: additionnalData,
					}).catch((e) => {
						console.log(e);
					});
				} else if (insulinData[e]["type"] == insulinFilter[1]) {
					// type = "AUTO_BASAL_DELIVERY"
					// additionnalData = {
					// 	bolusAmount: insulinData[e].bolusAmount,
					// };
					additionnalData = buildAdditionnalData(insulinData[e]);
					Insulin.create({
						datetime: dateUtils.toNormalizedUTCISOStringWithCountry(
							userInfo.dataValues.country,
							dateUtils.ISOTo5Minutes(insulinData[e].dateTime)
						),
						carbInput: 0,
						userId: userId,
						insulinType: insulinFilter[1],
						insulinDescr: additionnalData,
					}).catch((e) => {
						console.log(e);
					});
				} else if (insulinData[e]["type"] == insulinFilter[2]) {
					// type = "MEAL"
					additionnalData = buildAdditionnalData(insulinData[e]);
					Insulin.create({
						datetime: dateUtils.toNormalizedUTCISOStringWithCountry(
							userInfo.dataValues.country,
							dateUtils.ISOTo5Minutes(insulinData[e].dateTime)
						),
						carbInput: insulinData[e].amount,
						userId: userId,
						insulinType: insulinFilter[2],
						insulinDescr: additionnalData,
					}).catch((e) => {
						console.log(e);
					});
				}
			}
		}
	}
	let lastGlucoseData = await getLast24HData(1, userId);
	for (let i in glucoseData) {
		if (glucoseData[i].datetime && parseInt(glucoseData[i].sg) != 0) {
			let existCheck = lastGlucoseData.filter((x) => {
				let tempDate = new Date();
				tempDate.setTime(x.datetime.getTime());
				return (
					tempDate.toISOString() ==
					dateUtils.toNormalizedUTCISOStringWithCountry(
						userInfo.dataValues.country,
						dateUtils.ISOTo5Minutes(glucoseData[i].datetime)
					)
				);
			});
			if (!existCheck.length) {
				GlocuseData.create({
					datetime: dateUtils.toNormalizedUTCISOStringWithCountry(
						userInfo.dataValues.country,
						dateUtils.ISOTo5Minutes(glucoseData[i].datetime)
					),
					glucose: parseInt(glucoseData[i].sg),
					pumpSN: pumpSerial,
					importName: importName,
					userId: userId,
				}).catch((e) => {
					console.log(e);
					// console.log(lastGlucoseData[0]);
					// console.log(lastGlucoseData[1]);
					// console.log(lastGlucoseData[2]);
					// console.log(lastGlucoseData[3]);
				});
				lastDatetimeImport =
					dateUtils.toNormalizedUTCISOStringWithCountry(
						userInfo.dataValues.country,
						dateUtils.ISOTo5Minutes(glucoseData[i].datetime)
					);
			}
		}
	}
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
	for (let item in userList) {
		console.log("userId n°: " + userList[item].dataValues.userId);
		await autoImport(userList[item].dataValues.userId).catch((err) => {
			return err;
		});
	}
	return 1;
}

async function getLast24HData(type, userId) {
	// Retrieves last 24h datas for glucose or insulin

	if (type > 1 || typeof type != "number") {
		return [];
	}

	let targetDateMs = dateUtils.normalizedUTC(new Date().getTime()) - 87200000;
	let finaleDate = new Date();
	finaleDate.setTime(targetDateMs);
	finaleDate.setSeconds(0);
	finaleDate.setMilliseconds(0);
	let dataList = [];
	if (type) {
		let data = await GlucoseData.findAll({
			where: {
				datetime: {
					[Op.gte]: finaleDate.toISOString(),
				},
				userId: userId,
			},
		});
		data.map((x) => {
			dataList.push(x.dataValues);
		});
	} else {
		let data = await Insulin.findAll({
			where: {
				datetime: {
					[Op.gte]: finaleDate.toISOString(),
				},
				userId: userId,
			},
		});
		data.map((x) => {
			dataList.push(x.dataValues);
		});
	}
	return dataList;
}

function buildAdditionnalData(insulinData) {
	let dataType = insulinData["type"];
	if (dataType == "INSULIN") {
		return JSON.stringify({
			activationType: insulinData.activationType,
			programmedFastAmount: insulinData.programmedFastAmount,
			programmedDuration: insulinData.programmedDuration,
			deliveredFastAmount: insulinData.deliveredFastAmount,
			bolusType: insulinData.bolusType,
		});
	} else if (dataType == "MEAL") {
		return null;
	} else if (dataType == "AUTO_BASAL_DELIVERY") {
		return JSON.stringify({
			bolusAmount: insulinData.bolusAmount,
		});
	}
	return null;
}

module.exports = {
	autoImport,
	autoImportAllUsers,
};
