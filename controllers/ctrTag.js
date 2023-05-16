const Tag = require("../models/modelTag");
const seq = require("../config/config");
const sequelize = seq.sequelize;
const Sequelize = seq.Sequelize;
const passport = require("../app");
const { Op } = require("sequelize");
const GlucoseData = require("../models/modelGlucoseData");

//////////////////////////////////////////////////////
/////////////// Routes controllers ///////////////////
//////////////////////////////////////////////////////

/**
 *  post one tag route controller. insert an activation tag.
 *
 * @param req
 * @param res
 */
exports.postOne = function (req, res) {
	try {
		passport.authenticate(
			"local-jwt",
			{ session: false },
			function (err, user) {
				if (err) {
					return res.status(500).json("Authentication error");
				}
				if (!user) {
					return res.status(401).json("Incorrect token");
				}
				Tag.create({
					name: req.body.tag,
					startDatetime: req.body.startDatetime,
					endDatetime: req.body.endDatetime,
					userId: user.id,
					isPending: false,
					wasAuto: false,
				})
					.then(() => {
						return res.status(200).json("ok");
					})
					.catch((err) => {
						return res.status(500).json("something wrong happened");
					});
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};
exports.postPending = function (req, res) {
	try {
		passport.authenticate(
			"local-jwt",
			{ session: false },
			async function (err, user) {
				if (err) {
					return res.status(500).json("Authentication error");
				}
				if (!user) {
					return res.status(401).json("Incorrect token");
				}
				let existingTag = 0;
				for (const pendingTag of req.body.pendingTags) {
					await Tag.findOne({
						logging: false,
						where: {
							[Op.and]: [
								{ startDatetime: pendingTag.pendingDatetime },
								{ userId: user.id },
							],
						},
					}).then((res) => {
						if (res) {
							console.log("Tag already exists.");
							existingTag++;
						} else {
							Tag.create({
								name: pendingTag.pendingName,
								startDatetime: pendingTag.pendingDatetime,
								endDatetime: pendingTag.pendingDatetime,
								userId: user.id,
								isPending: true,
								wasAuto: true,
							})
								.then(() => {
									console.log("insert pendingTags");
								})
								.catch((err) => {
									return res
										.status(500)
										.json("something wrong happened");
								});
						}
					});
				}
				if (existingTag == req.body.pendingTags.length) {
					return res.status(200).json("alreadyexists");
				} else {
					return res.status(200).json("redirect");
				}
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};

/**
 *  put one tag route controller. Edit an activation tag.
 *
 * @param req
 * @param res
 */
exports.putOne = function (req, res) {
	try {
		passport.authenticate(
			"local-jwt",
			{ session: false },
			function (err, user) {
				if (err) {
					return res.status(500).json("Authentication error");
				}
				if (!user) {
					return res.status(401).json("Incorrect token");
				}
				if (!req.body.tagName) {
					return res.status(401).json("Missing tagName");
				}
				if (!req.body.tagDatetime) {
					return res.status(401).json("Missing tagDatetime");
				}
				if (!req.body.tagId) {
					return res.status(401).json("Missing tagId");
				}
				// ERROR: req.body.tagDatetime contient une date qui n'est pas iso, c'est réglé normalement.
				Tag.update(
					{
						name: req.body.tagName,
						startDatetime: req.body.tagDatetime,
						isPending: false,
					},
					{ where: { id: req.body.tagId } }
				)
					.then(() => {
						console.log(req.body);
						return res.status(200).json("tag successfully edited");
					})
					.catch((err) => {
						return res
							.status(500)
							.json(
								"something wrong happened while editing a tag: " +
									err
							);
					});
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};
/**
 * Delete one tag activation of a user
 *
 * @param req
 * @param res
 * @return {Promise<void>}
 */
exports.deleteOne = async function (req, res) {
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
				if (!req.body.tagId) {
					return res.status(401).json("Missing tagId");
				}
				let response = await Tag.destroy({
					where: {
						userId: user.id,
						id: req.body.tagId,
					},
				});
				res.status(200).json("Tag " + req.body.tagId + " deleted.");
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};
/**
 * Change all tag activation name which have the same name that tagName with newTagName
 *
 * @param req
 * @param res
 */
exports.putAll = function (req, res) {
	try {
		passport.authenticate(
			"local-jwt",
			{ session: false },
			function (err, user) {
				if (err) {
					return res.status(500).json("Authentication error");
				}
				if (!user) {
					return res.status(401).json("Incorrect token");
				}
				if (!req.body.tagName) {
					return res.status(401).json("Missing tagName");
				}
				if (!req.body.newTagName) {
					return res.status(401).json("Missing newTagName");
				}
				Tag.update(
					{ name: req.body.newTagName },
					{ where: { name: req.body.tagName } }
				)
					.then(() => {
						console.log(req.body);
						return res
							.status(200)
							.json("Name successfully changed");
					})
					.catch((err) => {
						return res
							.status(500)
							.json(
								"something wrong happened while editing a tag: " +
									err
							);
					});
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};
/**
 * Delete all tag activations of a user. If request body contains tagName then it will delete all tag activations associated with this name
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
				if (!req.body.tagName) {
					return res.status(401).json("Missing tagName");
				}
				let response = "";
				if (req.body.tagName === "All") {
					response = await Tag.destroy({
						where: {
							userId: user.id,
						},
					});
				} else {
					response = await Tag.destroy({
						where: {
							userId: user.id,
							name: req.body.tagName,
						},
					});
				}
				console.log(response);
				res.status(200).json("Tag " + req.body.tagName + " deleted.");
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};
/**
 * get recent tags route controller. Retrieve 8 most recent tags (based on their activation date) of a user.
 *
 * @param req
 * @param res
 */
exports.getRecentTagsFromUserId = function (req, res) {
	try {
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
				Tag.findAll({
					where: {
						userId: user.id,
					},
					limit: 8,
					order: sequelize.literal("startDatetime DESC"),
					attributes: [
						[
							sequelize.fn("DISTINCT", sequelize.col("name")),
							"name",
						],
					],
				}).then((data) => {
					let tags = [];
					data.forEach((tag) => tags.push(tag["name"]));
					res.status(200).json(tags);
				});
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};
/**
 * get all tags route controller. Retrieve all the tags of a user
 *
 * @param req
 * @param res
 */
exports.getNamesFromUserId = function (req, res) {
	try {
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
				Tag.findAll({
					where: {
						userId: user.id,
					},
					attributes: [
						[
							sequelize.fn("DISTINCT", sequelize.col("name")),
							"name",
						],
					],
				}).then((data) => {
					let tags = [];
					data.forEach((tag) => tags.push(tag["name"]));
					res.status(200).json(tags);
				});
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};
/**
 * get recent history tags route controller. Retrieve 10 most recent tags (based on their creation date) of a user.
 *
 * @param req
 * @param res
 */
exports.getTagsHistoryByActivationTime = function (req, res) {
	try {
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
				if (!req.query.datetimeBegin) {
					return res.json({
						status: "error",
						message: "missing datetimeBegin",
					});
				}

				let datetime = new Date(req.query.datetimeBegin);

				Tag.findAll({
					attributes: [
						"name",
						"startDatetime",
						"updatedAt",
						"id",
						"wasAuto",
					],
					where: {
						[Op.and]: [
							{ userId: user.id },
							{
								startDatetime: {
									[Op.lt]: datetime.toISOString(),
								},
							},
							{
								isPending: {
									[Op.not]: true,
								},
							},
						],
					},
					limit: 10,
					order: sequelize.literal("startDatetime DESC"),
				}).then((data) => {
					let tags = [];
					data.forEach((tag) => tags.push(tag));
					res.status(200).json(tags);
				});
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};
/**
 * get recent history tags route controller. Retrieve 10 most recent tags (based on their creation date) of a user.
 *
 * @param req
 * @param res
 */
exports.getTagsHistory = function (req, res) {
	try {
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
				if (!req.query.datetimeBegin) {
					return res.json({
						status: "error",
						message: "missing datetimeBegin",
					});
				}

				let datetime = new Date(req.query.datetimeBegin);

				Tag.findAll({
					attributes: [
						"name",
						"startDatetime",
						"updatedAt",
						"id",
						"wasAuto",
					],
					where: {
						[Op.and]: [
							{ userId: user.id },
							{
								updatedAt: {
									[Op.lt]: datetime.toISOString(),
								},
							},
							{
								isPending: {
									[Op.not]: true,
								},
							},
						],
					},
					limit: 10,
					order: sequelize.literal("updatedAt DESC"),
				}).then((data) => {
					let tags = [];
					data.forEach((tag) => tags.push(tag));
					res.status(200).json(tags);
				});
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};
/**
 * get the count of all tag activations
 *
 * @param req
 * @param res
 */
exports.getCountAllActivations = function (req, res) {
	try {
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
				Tag.count({
					where: {
						userId: user.id,
					},
				}).then((data) => {
					res.status(200).json(data);
				});
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};

exports.getPendingTags = function (req, res) {
	try {
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
				Tag.findAll({
					attributes: ["name", "startDatetime", "updatedAt", "id"],
					where: {
						[Op.and]: [{ userId: user.id }, { isPending: 1 }],
					},
					order: sequelize.literal("startDatetime DESC"),
				}).then((pendingTags) => {
					res.status(200).json(pendingTags);
				});
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};
/**
 * get an array of days that contain tag activations
 *
 * @param req
 * @param res
 * @return {Promise<void>}
 */
exports.getTagsDays = async function (req, res) {
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
				let response = "";
				if (!req.query.tagName) {
					response = await Tag.findAll({
						where: {
							userId: user.id,
						},
						attributes: [
							[
								sequelize.fn(
									"DISTINCT",
									sequelize.cast(
										sequelize.col("tag.startDatetime"),
										"date"
									)
								),
								"date",
							],
						],
					});
				} else {
					response = await Tag.findAll({
						where: {
							userId: user.id,
							name: req.query.tagName,
						},
						attributes: [
							[
								sequelize.fn(
									"DISTINCT",
									sequelize.cast(
										sequelize.col("tag.startDatetime"),
										"date"
									)
								),
								"date",
							],
						],
					});
				}

				res.status(200).json(
					response.map((date) => date.dataValues.date)
				);
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};

exports.getTagsDay = async function (req, res) {
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
				if (!req.query.day) {
					return res.status(400).json("missing day parameter");
				}
				let fromDate = new Date(req.query.day);
				let toDate = new Date(req.query.day);
				toDate.setDate(toDate.getDate() + 1);
				let response = "";
				if (!req.query.tagName) {
					response = await Tag.findAll({
						attributes: ["id", "name", "startDatetime"],
						where: {
							userId: user.id,
							startDatetime: {
								[Sequelize.Op.between]: [
									fromDate.toISOString(),
									toDate.toISOString(),
								],
							},
						},
						order: [["startDatetime"]],
					});
				} else {
					response = await Tag.findAll({
						attributes: ["id", "name", "startDatetime"],
						where: {
							userId: user.id,
							name: req.query.tagName,
							startDatetime: {
								[Sequelize.Op.between]: [fromDate, toDate],
							},
						},
						order: [["startDatetime"]],
					});
				}
				res.status(200).json(response);
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};

exports.getTagsWithoutData = async function (req, res) {
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

				let tagWithNoDataList = [];
				let dataList = [];
				let dataResponse = await GlucoseData.findAll({
					where: {
						userId: user.id,
					},
				});
				dataResponse.forEach((element) => {
					dataList.push(element.dataValues);
				});
				let TagResponse = await Tag.findAll({
					where: {
						userId: user.id,
						wasAuto: false,
					},
				});
				TagResponse.forEach((element) => {
					let startDateMs =
						element.dataValues.startDatetime.getTime() - 900000;
					let endDateMs =
						element.dataValues.startDatetime.getTime() + 900000;

					let correspondingData = dataList.filter((data) => {
						return (
							startDateMs <= data.datetime.getTime() &&
							data.datetime.getTime() <= endDateMs
						);
					});
					if (!correspondingData.length) {
						tagWithNoDataList.push(element.dataValues);
					}
				});
				return res.status(200).json(tagWithNoDataList);
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};

exports.getTagsInRange = async function (req, res) {
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
				let startDate = req.query.startDate;
				let endDate = req.query.endDate;
				if (!startDate || !endDate) {
					return res
						.status(400)
						.json("Missing or incorrect parameter");
				} else {
					let allTags = await Tag.findAll({
						where: {
							userId: user.id,
							isPending: 0,
						},
					});
					let tagsInPeriod = allTags
						.map((element) => {
							return element.dataValues;
						})
						.filter((element) => {
							return (
								new Date(element.startDatetime) >
									new Date(startDate) &&
								new Date(element.endDatetime) <
									new Date(endDate)
							);
						});
					return res.status(200).json(tagsInPeriod);
				}
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};
//////////////////////////////////////////////////////
/////////// controllers functions helpers ////////////
//////////////////////////////////////////////////////

/**
 * Retrieve all activation of a tag.
 *
 * @param tagName : string
 * @param userId : string
 * @param fromToDate
 * @param weekdays
 * @return {Promise<*|string>} : object with all activations of a tag
 */
exports.getTagsFromName = async function (
	tagName,
	userId,
	fromToDate = null,
	weekdays
) {
	try {
		let reqObject = {
			attributes: ["startDatetime"],
			where: {
				userId: userId,
				name: tagName,
				isPending: 0,
			},
		};
		if (fromToDate) {
			reqObject.where["startDatetime"] = {
				[Sequelize.Op.between]: [
					new Date(fromToDate[0]),
					new Date(fromToDate[1]),
				],
			};
		}
		let res = await Tag.findAll(reqObject);
		if (weekdays.length > 0) {
			res = res.filter((tag) =>
				weekdays.includes(
					new Date(tag.dataValues.startDatetime).getDay()
				)
			);
			// let results = res.map(tag => new Date(tag.dataValues.startDatetime).getDay());
			// results = results.map(tag => parseInt(tag));
			// console.log(results)
			// console.log(results.filter(tag => weekdays.includes(tag)));
		}

		return res;
	} catch (error) {
		return "getTagsFromName request error";
	}
};
