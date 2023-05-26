const GlucoseData = require("../models/modelGlucoseData");
const Insulin = require("../models/modelInsulin");
const AutoImportData = require("../models/modelAutoImportData");
const seq = require("../config/config");
const ctrTag = require("../controllers/ctrTag");
const Sequelize = seq.Sequelize,
	sequelize = seq.sequelize;
const csv = require("fast-csv");
const fs = require("fs");
const passport = require("../app");
const { Op } = require("sequelize");
const { response } = require("express");
const careLinkImport = require("../utils/careLinkImport.js");
const autoImportData = require("../utils/autoImportData.js");
const dateUtils = require("../utils/dateUtils.js");

//////////////////////////////////////////////////////
/////////////// Routes controllers ///////////////////
//////////////////////////////////////////////////////

exports.getDataByHour = async function (req, res) {
	try {
		passport.authenticate(
			"local-jwt",
			{ session: false },
			async function (err, user) {
				if (err) {
					return res.json({
						status: "Authentication error",
						message: err,
					});
				}
				if (!user) {
					return res.json({
						status: "error",
						message: "Incorrect token",
					});
				}
				if (
					parseInt(req.query.hours) < 1 ||
					parseInt(req.query.hours) > 72
				) {
					return res
						.status(400)
						.json("The number of hour is not valid");
				}
				datas = { GlucoseData: [], InsulinData: [] };
				let actualDate = dateUtils.normalizedUTC(new Date().getTime());
				let hours = parseInt(req.query.hours);
				let offset = parseInt(req.query.offset);
				if (offset < 0) {
					offset = 0;
				}
				// console.log(offset, hours, req.query.offset);
				let numberOfHoursToSubstract = (offset + hours) * 3600000;
				let startTargetDate = actualDate - numberOfHoursToSubstract;
				let endTargetDate = actualDate - offset * 3600000;

				// Récupère les données de glycémie
				let response = await GlucoseData.findAll({
					where: {
						userId: user.id,
					},
				}).catch((err) => {
					return res.status(500).json(err);
				});
				datas.GlucoseData = response
					// On filtre pour ne garder que les données des x dernières heures
					.filter((x) => {
						return (
							dateUtils.normalizedUTC(
								new Date(x.datetime).getTime()
							) > startTargetDate &&
							dateUtils.normalizedUTC(
								new Date(x.datetime).getTime()
							) < endTargetDate
						);
					});
				// Récupère les données d'insuline
				response = await Insulin.findAll({
					where: {
						userId: user.id,
					},
				}).catch((err) => {
					return res.status(500).json(err);
				});
				datas.InsulinData = response.filter((x) => {
					return (
						dateUtils.normalizedUTC(
							new Date(x.datetime).getTime()
						) > startTargetDate &&
						dateUtils.normalizedUTC(
							new Date(x.datetime).getTime()
						) < endTargetDate
					);
				});

				return res.status(200).json(datas);
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};

/**
 *  Chart route controller. retrieves and formats data for the ChartBasic chart
 *
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
exports.chart = async function (req, res) {
	try {
		passport.authenticate(
			"local-jwt",
			{ session: false },
			async function (err, user) {
				if (err) {
					return res.json({
						status: "Authentication error",
						message: err,
					});
				}
				if (!user) {
					return res.json({
						status: "error",
						message: "Incorrect token",
					});
				}
				if (!"tagName" in req.query) {
					return res.json({
						status: "error",
						message: "missing tagName",
					});
				}
				if (!"fromTime" in req.query || !"toTime" in req.query) {
					return res.json({
						status: "error",
						message: "missing time range",
					});
				}
				let fromToTime = [req.query.fromTime, req.query.toTime];

				let fromToDate = null;
				if ("startDate" in req.query && "endDate" in req.query) {
					fromToDate = [req.query.startDate, req.query.endDate];
				}
				let weekDays = [];
				if ("weekDays" in req.query) {
					weekDays = req.query.weekDays
						.split("-")
						.map((day) => parseInt(day));
				}

				let allData = await getAllDataFromTag(
					await ctrTag.getTagsFromName(
						req.query.tagName,
						user.id,
						fromToDate,
						weekDays
					),
					user.id,
					fromToTime
				);
				let response = {
					datasetsLabel: Object.keys(allData),
					chartData: chartFormatAllData(
						addRelativeToAllData(allData)
					),
				};
				res.status(200).json(response);
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};
/**
 * Import Data file Controller
 *
 * @param req
 * @param res
 */
exports.postFile = function (req, res) {
	try {
		// Authentification strategy
		passport.authenticate(
			"local-jwt",
			{ session: false },
			function (err, user) {
				if (err) {
					return res.json({
						status: "Authentication error",
						message: err,
					});
				}
				if (!user) {
					return res.json({
						status: "error",
						message: "Incorrect token",
					});
				}
				if (!req.body.sensorModel) {
					return res
						.status(400)
						.json("No sensor model in the request.");
				}
				if (!req.body.importName) {
					return res
						.status(400)
						.json("No import name in the request.");
				}
				if (!req.file) {
					return res.status(400).json("No file were uploaded.");
				}
				if (req.file.originalname.split(".")[1] !== "csv") {
					return res.status(400).json("Only CSV files are allowed.");
				}
				switch (req.body.sensorModel) {
					case "minimed":
						getFromMiniMedPump(req, res, user, req.body.importName);
						break;
					default:
						return res
							.status(400)
							.json("Sensor model not implemented.");
				}
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};

exports.postManyData = function (req, res) {
	try {
		passport.authenticate(
			"local-jwt",
			{ session: false },
			async function (err, user) {
				if (err) {
					return res.json({
						status: "Authentication error",
						message: err,
					});
				}
				if (!user) {
					return res.json({
						status: "error",
						message: "Incorrect token",
					});
				}
				try {
					req.body["glucose_data"].forEach(async (element) => {
						await GlucoseData.create({
							datetime: element.datetime,
							glucose: element.glucose,
							pumpSN: element.pumpSN,
							importName: "MANUAL-INDIVIDUAL-POST",
							userId: user.id,
						});
					});
					res.status(200).json("Data created");
				} catch (err) {
					return res.status(500).json("Error while inserting data");
				}
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};

/**
 * Get all the days from data
 *
 * @param req
 * @param res
 */
exports.getDataDays = async function (req, res) {
	try {
		passport.authenticate(
			"local-jwt",
			{ session: false },
			async function (err, user) {
				if (err) {
					return res.json({
						status: "Authentication error",
						message: err,
					});
				}
				if (!user) {
					return res.json({
						status: "error",
						message: "Incorrect token",
					});
				}
				let response = await GlucoseData.findAll({
					where: {
						userId: user.id,
					},
					attributes: [
						[
							sequelize.fn(
								"DISTINCT",
								sequelize.cast(
									sequelize.col("glucosedata.datetime"),
									"date"
								)
							),
							"date",
						],
					],
				});
				res.status(200).json(
					response.map((date) => date.dataValues.date)
				);
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};
/**
 * Get all datetime from data
 *
 * @param req
 * @param res
 */
exports.getDataDatetime = async function (req, res) {
	try {
		passport.authenticate(
			"local-jwt",
			{ session: false },
			async function (err, user) {
				if (err) {
					return res.json({
						status: "Authentication error",
						message: err,
					});
				}
				if (!user) {
					return res.json({
						status: "error",
						message: "Incorrect token",
					});
				}
				let response = await GlucoseData.findAll({
					where: {
						userId: user.id,
					},
					attributes: [
						[
							sequelize.fn(
								"DISTINCT",
								sequelize.col("glucosedata.datetime")
							),
							"date",
						],
					],
				});
				res.status(200).json(
					response.map((date) => date.dataValues.date)
				);
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};
/**
 * Get distinct import names
 *
 * @param req
 * @param res
 * @return {Promise<void>}
 */
exports.getImportNames = async function (req, res) {
	try {
		passport.authenticate(
			"local-jwt",
			{ session: false },
			async function (err, user) {
				if (err) {
					return res.json({
						status: "Authentication error",
						message: err,
					});
				}
				if (!user) {
					return res.json({
						status: "error",
						message: "Incorrect token",
					});
				}
				let response = await GlucoseData.findAll({
					where: {
						userId: user.id,
					},
					attributes: [
						[
							sequelize.fn(
								"DISTINCT",
								sequelize.col("importName")
							),
							"importName",
						],
					],
				});
				res.status(200).json(
					response
						.map((name) => name.dataValues.importName)
						.filter((x) => {
							return x != "AUTO-IMPORTED";
						})
				);
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};
/**
 * delete data of an import
 *
 * @param req
 * @param res
 * @return {Promise<void>}
 */
exports.deleteFile = async function (req, res) {
	try {
		passport.authenticate(
			"local-jwt",
			{ session: false },
			async function (err, user) {
				if (err) {
					return res.json({
						status: "Authentication error",
						message: err,
					});
				}
				if (!user) {
					return res.json({
						status: "error",
						message: "Incorrect token",
					});
				}
				if (!req.body.importName) {
					return res
						.status(400)
						.json("No import name in the request.");
				}
				let response = await GlucoseData.destroy({
					where: {
						userId: user.id,
						ImportName: req.body.importName,
					},
				});
				res.status(200).json(
					"data of '" + req.body.importName + "' import deleted."
				);
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};
/**
 * Delete all data of a user
 *
 * @param req
 * @param res
 * @return {Promise<void>}
 */
exports.deleteAll = async function (req, res) {
	try {
		passport.authenticate(
			"local-jwt",
			{ session: false },
			async function (err, user) {
				if (err) {
					return res.json({
						status: "Authentication error",
						message: err,
					});
				}
				if (!user) {
					return res.json({
						status: "error",
						message: "Incorrect token",
					});
				}
				let response = await GlucoseData.destroy({
					where: {
						userId: user.id,
					},
				});
				res.status(200).json("All data deleted.");
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};

exports.addAutoImportAccountData = async function (req, res) {
	try {
		passport.authenticate(
			"local-jwt",
			{ session: false },
			async function (err, user) {
				let password = req.body["password"];
				let username = req.body["username"];
				let country = req.body["country"];
				let patientUsername = req.body["patientUsername"];

				if (!password || !username || !country || !patientUsername) {
					return res.status(400).json("Some params are missing !");
				}
				let response = await AutoImportData.findOne({
					where: {
						userId: user.id,
					},
				});
				if (response) {
					return res
						.status(500)
						.json(
							"User already has an account configurated! Use another route to update it."
						);
				}
				try {
					await careLinkImport.testCredential(
						username,
						password,
						country,
						patientUsername
					);
				} catch {
					return res
						.status(500)
						.json("Provided credentials are not correct");
				}

				response = await AutoImportData.create({
					userId: user.id,
					medtronicUser: req.body["username"],
					medtronicPassword: req.body["password"],
					country: req.body["country"],
					patientUsername: req.body["patientUsername"],
					lastDataUpdate: undefined,
				});
				return res
					.status(201)
					.json("Request Received and auto import initialized");
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};

exports.deleteAutoImportConfiguration = async (req, res) => {
	try {
		passport.authenticate(
			"local-jwt",
			{ session: false },
			async function (err, user) {
				if (err) {
					return res.json({
						status: "Authentication error",
						message: err,
					});
				}
				if (!user) {
					return res.json({
						status: "error",
						message: "Incorrect token",
					});
				}
				let response = await AutoImportData.findOne({
					where: {
						userId: user.id,
					},
				});
				if (response) {
					try {
						await AutoImportData.destroy({
							where: {
								userId: user.id,
							},
						});
						return res.status(200).json("Config deleted");
					} catch (e) {
						console.log(e);
						return res
							.status(500)
							.json("Error while deleting config");
					}
				} else {
					return res.status(200).json("Nothing to delete");
				}
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};

exports.checkAutoImportConfiguration = async (req, res) => {
	try {
		passport.authenticate(
			"local-jwt",
			{ session: false },
			async function (err, user) {
				if (err) {
					return res.json({
						status: "Authentication error",
						message: err,
					});
				}
				if (!user) {
					return res.json({
						status: "error",
						message: "Incorrect token",
					});
				}
				let response = await AutoImportData.findOne({
					where: {
						userId: user.id,
					},
				});
				if (response) {
					return res
						.status(200)
						.json("Auto import already configured.");
				} else {
					return res.status(200).json("Auto import not configured.");
				}
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};

exports.autoImportData = async (req, res) => {
	try {
		passport.authenticate(
			"local-jwt",
			{ session: false },
			async function (err, user) {
				if (err) {
					return res.json({
						status: "Authentication error",
						message: err,
					});
				}
				if (!user) {
					return res.json({
						status: "error",
						message: "Incorrect token",
					});
				}
				let response = await AutoImportData.findOne({
					where: {
						userId: user.id,
					},
				});
				if (!response) {
					return res
						.status(500)
						.json("User hasn't configured the autoimport!");
				}
				try {
					await autoImportData
						.autoImport(response.dataValues.userId)
						.then(() => {
							console.log("Auto import finished");
							res.status(200).json("Data imported");
						})
						.catch((err) => {
							console.log(err);
							console.log("Error while auto-importing data");
							res.status(500).json("Could not import data!");
						});
				} catch {
					console.log(
						"Unknow error happend while auto-importing data"
					);
					res.status(500).json("Could not import data!");
				}
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};

exports.getRangesWithNoData = async (req, res) => {
	try {
		passport.authenticate(
			"local-jwt",
			{ session: false },
			async function (err, user) {
				if (err) {
					return res.json({
						status: "Authentication error",
						message: err,
					});
				}

				if (!user) {
					return res.json({
						status: "error",
						message: "Incorrect token",
					});
				}

				let response = await GlucoseData.findAll({
					where: {
						userId: user.id,
					},
				});

				let data_list = response.map((x) => {
					return x.dataValues;
				});
				let period_without_data = [];
				data_list.forEach((element, index, array) => {
					if (index < array.length - 1) {
						let current_datetime = new Date(
							element.datetime
						).getTime();
						let next_datetime = new Date(
							array[index + 1].datetime
						).getTime();
						let diff = next_datetime - current_datetime;
						// Le 300000 correspond au threshold en ms (donc on prend les données 15mins avant et après)
						if (diff > 300000) {
							period_without_data.push({
								start: element.datetime,
								end: array[index + 1].datetime,
							});
						}
					}
				});
				res.status(200).json(period_without_data);
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};

exports.getDataInRange = async (req, res) => {
	try {
		passport.authenticate(
			"local-jwt",
			{ session: false },
			async function (err, user) {
				if (err) {
					return res.json({
						status: "Authentication error",
						message: err,
					});
				}

				if (!user) {
					return res.json({
						status: "error",
						message: "Incorrect token",
					});
				}
				if (!req.query.startDate || !req.query.endDate) {
					res.status(400).json(
						"One of the two required parameter (startDate or endDate) is not set."
					);
				}
				if (
					new Date(req.query.startDate) > new Date(req.query.endDate)
				) {
					res.status(400).json(
						"startDate has to be older than endDate."
					);
				}
				let insulinResponse = await Insulin.findAll({
					where: {
						userId: user.id,
						datetime: {
							[Op.gte]: req.query.startDate,
							[Op.lte]: req.query.endDate,
						},
					},
				});

				let glucoseResponse = await GlucoseData.findAll({
					where: {
						userId: user.id,
						datetime: {
							[Op.gte]: req.query.startDate,
							[Op.lte]: req.query.endDate,
						},
					},
				});

				let finalData = {
					insulin: insulinResponse.map((element) => {
						return element.dataValues;
					}),
					glucose: glucoseResponse.map((element) => {
						return element.dataValues;
					}),
				};

				res.status(200).json(finalData);
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};

//////////////////////////////////////////////////////
/////////// controllers functions helpers ////////////
//////////////////////////////////////////////////////
async function getDatetimesDB(user) {
	let response = GlucoseData.findAll({
		where: {
			userId: user.id,
		},
		attributes: [
			[
				sequelize.fn("DISTINCT", sequelize.col("glucosedata.datetime")),
				"date",
			],
		],
	});

	return await response;
}

async function insertIfNoDup(dataObj, importName, user) {
	let seeDup = 0;
	let seeInsert = 0;
	let mostRecentInsulinDatetime = "";
	// Glucose
	for (let i = 0; i < dataObj.date.length; i++) {
		let dbFormatDatetime = formatDatetime(dataObj.date[i], dataObj.time[i]);
		await GlucoseData.findOne({
			logging: false,
			where: {
				datetime: dbFormatDatetime,
				userId: user.id,
			},
		}).then((res) => {
			if (res) {
				seeDup++;
			} else {
				GlucoseData.create({
					datetime: dbFormatDatetime,
					glucose: parseInt(dataObj.glucose[i]),
					pumpSN: dataObj.pumpSN[i],
					importName: importName,
					userId: user.id,
				}).then(seeInsert++);
			}
		});
	}
	// Insulin
	for (let z = 0; z < dataObj.carbDate.length; z++) {
		let dbFormatDatetime = formatDatetime(
			dataObj.carbDate[z],
			dataObj.carbTime[z]
		);
		if (mostRecentInsulinDatetime) {
			dbFormatDatetime > mostRecentInsulinDatetime
				? (mostRecentInsulinDatetime = dbFormatDatetime)
				: "";
		} else {
			mostRecentInsulinDatetime = dbFormatDatetime;
		}
		let description = JSON.stringify({
			activationType: "RECOMMENDED",
			programmedFastAmount: dataObj.estimateUnits[z],
			programmedDuration: 0,
			deliveredFastAmount: dataObj.estimateUnits[z],
			bolusType: "FAST",
		});
		await Insulin.findOne({
			logging: false,
			where: {
				datetime: dbFormatDatetime,
				userId: user.id,
				insulinType: "MEAL",
				// { insulinDescr: description },
			},
		}).then((res) => {
			if (res) {
				seeDup++;
			} else {
				console.log(dbFormatDatetime);
				console.log(res);
				try {
					Insulin.create({
						datetime: dbFormatDatetime,
						carbInput: parseInt(dataObj.carbInput[z]),
						userId: user.id,
						insulinType: "MEAL",
						insulinDescr: description,
					}).then(seeInsert++);
				} catch (e) {
					console.log(e);
				}
			}
		});
	}
	return [seeDup, seeInsert, mostRecentInsulinDatetime];
}
/**
 *  Minimed import method
 *
 * @param req
 * @param res
 * @param user : object of a user context
 * @param importName
 */
function getFromMiniMedPump(req, res, user, importName) {
	const fileRows = [];
	// open uploaded file
	csv.parseFile(req.file.path, { delimiter: ";" })
		.on("data", function (data) {
			fileRows.push(data); // push each row
		})
		.on("end", function () {
			fs.unlinkSync(req.file.path); // remove temp file
			////////////////////process "fileRows" and respond
			// Variables
			let dataObj = {
				date: [],
				time: [],
				glucose: [],
				pumpSN: [],
				carbDate: [],
				carbTime: [],
				carbInput: [],
				estimateUnits: [],
			};
			let cols = findInFileRows(fileRows, 0);
			let colDate = cols.colDate,
				colTime = cols.colTime,
				colGlucose = cols.colGlucose,
				pumpSN = cols.pumpSN,
				colCarbInput = cols.colCarbInput,
				colEstimateUnits = cols.colEstimateUnits,
				colDeliveringStatus = cols.colDeliveringStatus;
			// Retrieve date time and glucose rows
			let i = 0;
			fileRows.forEach((row) => {
				if ((typeof row[0]).toString() === "string") {
					if (row[0].includes("--")) {
						cols = findInFileRows(fileRows, fileRows.indexOf(row));
						colDate = cols.colDate;
						colTime = cols.colTime;
						colGlucose = cols.colGlucose;
						pumpSN = cols.pumpSN;
						colCarbInput = cols.colCarbInput;
						colEstimateUnits = cols.colEstimateUnits;
						colDeliveringStatus = cols.colDeliveringStatus;
					}
				}
				// Glucose
				if (
					(typeof row[colDate]).toString() === "string" &&
					(typeof row[colTime]).toString() === "string" &&
					(typeof row[colGlucose]).toString() === "string"
				) {
					if (
						row[colDate].includes("/") &&
						row[colTime].includes(":") &&
						row[colGlucose].length >= 2
					) {
						if (row[colDate].substr(0, 3).includes("/")) {
							let dateArray = row[colDate].split("/");
							const reversed = dateArray.reverse();
							dataObj.date.push(
								reversed.toString().replace(/,/g, "/")
							);
						} else {
							dataObj.date.push(row[colDate]);
						}
						dataObj.time.push(row[colTime]);
						dataObj.glucose.push(row[colGlucose]);
						dataObj.pumpSN.push(pumpSN);
					}
				}
				// Insulin
				if (
					(typeof row[colCarbInput]).toString() === "string" &&
					(typeof row[colDate]).toString() === "string" &&
					(typeof row[colTime]).toString() === "string"
				) {
					if (
						row[colDate].includes("/") &&
						row[colTime].includes(":") &&
						row[colCarbInput].length > 0 &&
						row[colDeliveringStatus] === "Delivered"
					) {
						if (row[colDate].substr(0, 3).includes("/")) {
							let dateArray = row[colDate].split("/");
							const reversed = dateArray.reverse();
							dataObj.carbDate.push(
								reversed.toString().replace(/,/g, "/")
							);
						} else {
							dataObj.carbDate.push(row[colDate]);
						}
						dataObj.carbTime.push(row[colTime]);
						dataObj.carbInput.push(row[colCarbInput]);
						dataObj.estimateUnits.push(
							parseFloat(row[colEstimateUnits].replace(/,/g, "."))
						);
					}
				}
			});

			try {
				insertIfNoDup(dataObj, importName, user).then(async (see) => {
					res.status(200).json({
						status: "ok",
						seeDup: see[0],
						seeInsert: see[1],
						firstDataDatetime: see[2],
					});
				});
			} catch (e) {
				res.status(500).json(
					"An error occured while inserting data" + e
				);
			}
		});
}

function getGMT(strDate, strTime, strTimeToCompare) {
	let myDate = new Date(strDate + " " + strTime);
	let myDateHoursOnly = myDate.getHours();

	let myDate2hoursDeDiffInVPS = new Date(strDate + " " + strTimeToCompare);
	let myDate2hoursDeDiffInVPSHoursOnly = myDate2hoursDeDiffInVPS.getHours();

	let sgo = myDate - myDate2hoursDeDiffInVPS; //-7200000
	if (myDateHoursOnly === myDate2hoursDeDiffInVPSHoursOnly) {
		return 0;
	}
	if (myDateHoursOnly > myDate2hoursDeDiffInVPS) {
		let GMT = sgo / 3600000 - 24;
		return GMT;
	} else {
		let GMT = sgo / 3600000;
		return GMT;
	}
}
/**
 * take date and time to return datetime
 *
 * @param strDate 2022/04/21
 * @param strTime 06:29:00
 * objDatetime Thu Apr 21 2022 06:29:00 GMT+0200 (heure d’été d’Europe centrale)
 * @return {string} 2022-04-23T04:55:00.000Z
 * 2022-04-21T01:55:00.000Z
 */

function formatDatetime(strDate, strTime) {
	let localDatetime = new Date(
		strDate.substring(0, 4),
		strDate.substring(5, 7) - 1,
		strDate.substring(8, 10),
		strTime.split(":")[0],
		strTime.split(":")[1]
	).toLocaleString("be-BE", {
		timeZone: "CET",
	});

	let localDate = localDatetime.split(",")[0];
	let localTime = localDatetime.split(",")[1];

	let gmt = getGMT(strDate, strTime, localTime);

	let year = parseInt(localDate.split(".")[2]);
	let month = parseInt(localDate.split(".")[1]);
	let day = parseInt(localDate.split(".")[0]);
	let hours = parseInt(strTime.split(":")[0]) + gmt;
	let minutes = parseInt(strTime.split(":")[1]);

	let newObjDatetime = new Date(year, month - 1, day, hours, minutes);
	let coeff = 1000 * 60 * 5;
	let almostFinalDatetime = new Date(
		Math.trunc(newObjDatetime.getTime() / coeff) * coeff
	);
	let isoDate = almostFinalDatetime.toISOString();
	return isoDate;
}

// Duplicate
function formatDatetimeWithoutRound(strDate, strTime) {
	let localDatetime = new Date(
		strDate.substring(0, 4),
		strDate.substring(5, 7) - 1,
		strDate.substring(8, 10),
		strTime.split(":")[0],
		strTime.split(":")[1]
	).toLocaleString("be-BE", {
		timeZone: "CET",
	});
	let localDate = localDatetime.split(",")[0];
	let localTime = localDatetime.split(",")[1];
	let gmt = getGMT(strDate, strTime, localTime);

	let year = parseInt(localDate.split(".")[2]);
	let month = parseInt(localDate.split(".")[1]);
	let day = parseInt(localDate.split(".")[0]);
	let hours = parseInt(strTime.split(":")[0]) + gmt;
	let minutes = parseInt(strTime.split(":")[1]);

	let newObjDatetime = new Date(year, month - 1, day, hours, minutes);

	let isoDate = newObjDatetime.toISOString();
	return isoDate;
}
/**
 * find the column number of time, date and glucose in the filerows array at start line.
 *
 * @param fileRows : array of the csv file
 * @param start : number of the line (where to start)
 * @return {{colTime: number, pumpSN: string, colGlucose: number, colDate: number}}
 */
function findInFileRows(fileRows, start) {
	let colDate = -1,
		colTime = -1,
		colGlucose = -1,
		pumpSN = "",
		colCarbInput = -1,
		colEstimateUnits = -1,
		colDeliveringStatus = -1;
	// Find column numbers and pump serial number
	for (let row = start; row < fileRows.length; row++) {
		if (
			colGlucose < 0 ||
			colTime < 0 ||
			colGlucose < 0 ||
			pumpSN === "" ||
			colCarbInput < 0 ||
			colEstimateUnits < 0.0 ||
			colDeliveringStatus < 0
		) {
			for (let col = 0; col < fileRows[row].length; col++) {
				if ((typeof fileRows[row][col]).toString() === "string") {
					if (colDate < 0) {
						if (fileRows[row][col] === "Date")
							colDate = fileRows[row].indexOf(fileRows[row][col]);
					}
					if (colTime < 0) {
						if (fileRows[row][col] === "Time")
							colTime = fileRows[row].indexOf(fileRows[row][col]);
					}
					if (colGlucose < 0) {
						if (fileRows[row][col] === "Sensor Glucose (mg/dL)")
							colGlucose = fileRows[row].indexOf(
								fileRows[row][col]
							);
					}
					if (pumpSN === "") {
						if (
							fileRows[row][col] === "Sensor" ||
							fileRows[row][col] === "Pump"
						)
							pumpSN = fileRows[row][col + 1];
					}
					if (colCarbInput < 0) {
						if (fileRows[row][col] === "BWZ Carb Input (grams)")
							colCarbInput = fileRows[row].indexOf(
								fileRows[row][col]
							);
					}
					if (colEstimateUnits < 0) {
						if (fileRows[row][col] === "BWZ Estimate (U)")
							colEstimateUnits = fileRows[row].indexOf(
								fileRows[row][col]
							);
					}
					if (colDeliveringStatus < 0) {
						if (fileRows[row][col] == "BWZ Status")
							colDeliveringStatus = fileRows[row].indexOf(
								fileRows[row][col]
							);
					}
				}
			}
		} else {
			break;
		}
	}
	return {
		colDate,
		colTime,
		colGlucose,
		pumpSN,
		colCarbInput,
		colEstimateUnits,
		colDeliveringStatus,
	};
}
/**
 * Retrieve all user's data according to the given tags.
 *
 * @param tags : object which contains all the activations of a tag
 * @param userId : string
 * @param fromToTime
 * @return {Promise<{}>} : object with all data
 */
async function getAllDataFromTag(tags, userId, fromToTime) {
	let datetimeTag = {};
	for (let i = 0; i < Object.keys(tags).length; i++) {
		let datetime = new Date(tags[i].getDataValue("startDatetime"));
		let fromDate = new Date(datetime);
		fromDate.setHours(fromDate.getHours() + parseInt(fromToTime[0]));
		let toDate = new Date(datetime);
		toDate.setHours(toDate.getHours() + parseInt(fromToTime[1]));
		datetimeTag[datetime.toISOString()] = await findFromDateToDate(
			fromDate,
			toDate,
			userId
		);
	}
	return datetimeTag;
}
/**
 * Retrieve data between two dates.
 *
 * @param fromDate : Date start
 * @param toDate : Date end
 * @param userId : string
 * @return {Promise<*|string>} : object data
 */
async function findFromDateToDate(fromDate, toDate, userId) {
	try {
		const results = await GlucoseData.findAll({
			attributes: ["datetime", "glucose"],
			where: {
				userId: userId,
				datetime: {
					[Sequelize.Op.between]: [fromDate, toDate],
				},
			},
			order: [["datetime"]],
		});
		return results;
	} catch (error) {
		return "findFromDateToDate request error";
	}
}
/**
 * modifies the data object by replacing the absolute dates by times relative to the activation of a tag
 *
 * @param realDatetimesTags : object
 * @return {any} : relativeTimesTags object
 */
function addRelativeToAllData(realDatetimesTags) {
	let relativeTimesTags = JSON.parse(JSON.stringify(realDatetimesTags));
	Object.keys(relativeTimesTags).forEach((e) => {
		let eventDate = new Date(e);
		relativeTimesTags[e].forEach((measure) => {
			let realDate = new Date(measure.datetime);
			let hours = dateDiff(eventDate, realDate);
			measure.relative =
				hours[0] + hours[1] + ":" + hours[2] + ":" + hours[3];
		});
	});
	return relativeTimesTags;
}
/**
 * manipulates the data of the all data object to facilitate the processing of the chart display in the web application.
 *
 * @param allData : object
 * @return {*|[]} : object chart data
 */
function chartFormatAllData(allData) {
	let chartData = [];
	Object.keys(allData).forEach((dataSet) =>
		chartData.push(allData[dataSet].map((e) => e.relative))
	);

	let xAxis = [];
	for (let i = 0; i < chartData.length; i++) {
		xAxis = xAxis.concat(chartData[i]);
	}
	let sortedXaxis = sortXaxis(xAxis);

	chartData = sortedXaxis.map((e) => [e, []]);
	for (let i = 0; i < Object.keys(allData).length; i++) {
		allData[Object.keys(allData)[i]].forEach((measure) => {
			let index = sortedXaxis.indexOf(measure.relative);
			chartData[index][1][i] = measure.glucose;
		});
	}

	return chartData;
}
/**
 * Calculate the time between two dates
 *
 * @param eventDate : Date main
 * @param realDate : Date relative
 * @return {[]} : string with time difference between the two dates
 */
function dateDiff(eventDate, realDate) {
	let d = Math.abs(eventDate - realDate) / 1000; // delta
	let r = {}; // result
	let s = {
		hour: 3600,
		minute: 60,
		second: 1,
	};
	let tab = [];
	if (realDate < eventDate) {
		tab.push("-");
	} else {
		tab.push("+");
	}
	Object.keys(s).forEach(function (key) {
		r[key] = Math.floor(d / s[key]);
		d -= r[key] * s[key];
		if (r[key] < 10) {
			r[key] = "0" + r[key];
		}
		tab.push(r[key]);
	});
	return tab;
}
/**
 * sort datetimes of the xAxis
 *
 * @param xAxis : Array of datetimes
 * @return {any[]} : Array of sorted datetimes
 */
function sortXaxis(xAxis) {
	for (let i = 0; i < xAxis.length; i++) {
		xAxis[i] =
			xAxis[i][0] +
			xAxis[i].substring(1, xAxis[i].length).split(":")[0] +
			xAxis[i].substring(1, xAxis[i].length).split(":")[1] +
			xAxis[i].substring(1, xAxis[i].length).split(":")[2];
	}
	xAxis.sort(function (a, b) {
		return a - b;
	});
	for (let i = 0; i < xAxis.length; i++) {
		xAxis[i] =
			xAxis[i].substring(0, 3) +
			":" +
			xAxis[i].substring(3, 5) +
			":" +
			xAxis[i].substring(5, 7);
	}
	return [...new Set(xAxis)];
}
