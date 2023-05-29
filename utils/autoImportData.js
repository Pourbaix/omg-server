require("dotenv").config();
// const User = require("./models/modelUser");
const GlocuseData = require("../models/modelGlucoseData");
const Insulin = require("../models/modelInsulin");
const AutoImportData = require("../models/modelAutoImportData");
const DetectionRanges = require("../models/modelDetectionRanges");
const Tags = require("../models/modelTag");
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
		userInfo.dataValues.country,
		userInfo.dataValues.patientUsername
	);

	let glucoseData = data["sgs"];
	let insulinData = data["markers"];
	let insulinFilter = ["INSULIN", "AUTO_BASAL_DELIVERY", "MEAL"];
	let pumpSerial = data["medicalDeviceSerialNumber"];
	let importName = "AUTO-IMPORTED";
	let lastDatetimeImport = userInfo.lastDataUpdate;

	// Ici on récupère les info des 24 dernières heures dans un objet js pour pouvoir faire des comparaisons d'existance après
	let lastInsulinData = await getLast24HData(0, userId);
	// Insulin
	for (let e in insulinData) {
		if (insulinData[e].dateTime) {
			// Check if data already exists
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
						) && x.insulinType == type
					// && x.insulinDescr == buildAdditionnalData(insulinData[e])
				);
			});
			if (!existCheck.length) {
				// Insert insulin data in database
				let additionnalData = {};
				if (
					insulinData[e]["type"] == insulinFilter[0] &&
					insulinData[e]["activationType"] == "AUTOCORRECTION"
				) {
					// type = "INSULIN" (CORRECTION)

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
					let correspondingData = insulinData.find((element) => {
						let targetDate = new Date(insulinData[e]["dateTime"]);
						let upDate = new Date(
							targetDate.getTime() + 120000
						).toISOString();

						return (
							element["type"] === "INSULIN" &&
							element["dateTime"] >= insulinData[e]["dateTime"] &&
							element["dateTime"] < upDate &&
							element["activationType"] === "RECOMMENDED"
						);
					});
					try {
						additionnalData = JSON.stringify({
							activationType: correspondingData.activationType,
							programmedFastAmount:
								correspondingData.programmedFastAmount,
							programmedDuration:
								correspondingData.programmedDuration,
							deliveredFastAmount:
								correspondingData.deliveredFastAmount,
							bolusType: correspondingData.bolusType,
						});
					} catch {
						console.log(additionnalData);
						console.log(insulinData[e]);
					}
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
	// On récup les données déjà existantes pour éviter les duplicas
	let lastGlucoseData = await getLast24HData(1, userId);
	// Glucose
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
				// insert glucose in data base
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

	// NOW RUN TAG DETECTION JOB ON LAST 24H MEAL BOLUS DATA
	await runTagDetection(userId);
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
	// Retrieves last 24h datas for glucose or insulin in JS object from DB

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
	// Builds the additionnal data JSON string
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

async function runTagDetection(userId) {
	let currentDate = new Date();
	let targetDate = new Date();
	// On prend que les données sur les dernière 24h (donc les données qui viennent de l'import auto effectué)
	targetDate.setTime(currentDate.getTime() - 25 * 3600000);

	// On vient récup les bolus et les ranges
	let bolusData = await Insulin.findAll({
		where: {
			userId: userId,
			insulinType: "MEAL",
			datetime: {
				[Op.between]: [
					targetDate.toISOString(),
					currentDate.toISOString(),
				],
			},
		},
	});

	let detectionRanges = await DetectionRanges.findAll({
		where: { userId: userId },
	});

	rangesValues = detectionRanges.map((element) => {
		return element.dataValues;
	});
	bolusDataValues = bolusData.map((element) => {
		return element.dataValues;
	});

	// Check if there are detections ranges configurated
	if (rangesValues.length) {
		// Pour chaque range configurée
		rangesValues.forEach((range) => {
			let days = convertNumberToDays(range.daysSelected);
			// On ne prend que les bolus qui sont dans la range de time
			let bolusInTimeRange = bolusDataValues.filter((bolus) => {
				let hours = new Date(bolus.datetime)
					.toISOString()
					.substring(11, 16);
				return (
					hours >= range.fromTime.substring(0, 5) &&
					hours <= range.toTime.substring(0, 5)
				);
			});

			// Puis uniquement ceux qui sont dans le(s) bon(s) jour(s)
			let bolusInDayRange = bolusInTimeRange.filter((bolus) => {
				// On récupère le jour du bolus en question
				let bolusDay = new Date(bolus.datetime).getUTCDay();
				// Si la liste des jours de la range contient le jour de notre bolus c'est OK
				return days.includes(bolusDay);
			});

			// On groupe les bolus par jours pour ensuite prendre celui qui apparait le plus tôt dans la journée
			let groupedBolusByDay = groupByDate(bolusInDayRange);

			let finalBolusList = [];
			Object.keys(groupedBolusByDay).forEach((element) => {
				finalBolusList.push(
					groupedBolusByDay[element].sort((a, b) => {
						return new Date(a.datetime) > new Date(b.datetime)
							? 1
							: new Date(a.datetime) < new Date(b.datetime)
							? -1
							: 0;
					})[0]
				);
			});
			// Inserting tags
			finalBolusList.forEach(async (bolus) => {
				// Checking if already exist before inserting
				let res = await Tags.findOne({
					where: {
						userId: userId,
						name: range.name,
						startDatetime: bolus.datetime,
						wasAuto: true,
					},
				});
				if (res) {
					// console.log(res);
				} else {
					await Tags.create({
						userId: userId,
						name: range.name,
						startDatetime: bolus.datetime,
						endDatetime: bolus.datetime,
						isPending: true,
						wasAuto: true,
					});
				}
			});
		});
	}

	return 1;
}

// This function is used to create an array of numbers corresponding to the days selected in the detection range
function convertNumberToDays(daysNumber) {
	let temp = daysNumber;
	// dayArray contains binary number
	let dayArray = [];
	// finalDayArray contains numbers of active days
	let finalDayArray = [];
	while (temp !== 0) {
		dayArray.push(temp % 2);
		temp = Math.floor(temp / 2);
	}
	while (dayArray.length < 7) {
		dayArray.push(0);
	}
	dayArray.forEach((day, index) => {
		if (day) {
			finalDayArray.push(index);
		}
	});
	return finalDayArray;
}

// Create an object with all the different dates and their corresponding bolus
function groupByDate(array) {
	let groups = {};
	array.forEach((element) => {
		let elementDate = new Date(element.datetime)
			.toISOString()
			.substring(0, 10);
		if (Object.keys(groups).includes(elementDate)) {
			groups[elementDate].push(element);
		} else {
			groups[elementDate] = [element];
		}
	});
	return groups;
}

module.exports = {
	autoImport,
	autoImportAllUsers,
};
