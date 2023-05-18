const Insulin = require("../models/modelInsulin");
const seq = require("../config/config");
const sequelize = seq.sequelize;
const Sequelize = seq.Sequelize;
const passport = require("../app");
const { Op } = require("sequelize");

//////////////////////////////////////////////////////
/////////////// Routes controllers ///////////////////
//////////////////////////////////////////////////////

exports.getBolusWithFormattedDateAndTime = function (req, res) {
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

				let currentDate = new Date(req.query.firstData);
				let targetDate = new Date();
				// On prend les données des 3 derniers mois (+ 1 jours) donc 3 mois et un jour
				targetDate.setTime(currentDate.getTime() - 7862400000);

				Insulin.findAll({
					attributes: [
						[
							sequelize.fn(
								"time_format",
								sequelize.col("datetime"),
								"%H:%i"
							),
							"extractedTime",
						],
						[
							sequelize.fn(
								"date_format",
								sequelize.col("datetime"),
								"%Y-%m-%d"
							),
							"extractedDate",
						],
					],
					where: {
						userId: user.id,
						insulinType: "MEAL",
						datetime: {
							[Op.between]: [
								targetDate.toISOString(),
								currentDate.toISOString(),
							],
						},
					},
					limit: 10000,
					order: sequelize.literal("updatedAt DESC"),
				}).then((events) => {
					console.log("OK QUERY");
					let bolusEvents = [];
					events.forEach((event) => {
						// ATTENTION => CES DATE ET TIME SONT EN UTC 0
						// => Trouver un moyen de remettre à l'heure locale en front sinon
						// on va avoir un décalage sur les données si c'est le front qui
						// fait le process de détection
						let date = event.dataValues.extractedDate;
						let time = event.dataValues.extractedTime;
						bolusEvents.push({ date: date, time: time });
					});
					res.status(200).json(bolusEvents);
				});
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};
