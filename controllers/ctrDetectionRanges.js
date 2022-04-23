const DetectionRanges = require("../models/modelDetectionRanges");
const seq = require("../config/config");
const sequelize = seq.sequelize;
const Sequelize = seq.Sequelize;
const passport = require("../app");
const {Op} = require("sequelize");

//////////////////////////////////////////////////////
/////////////// Routes controllers ///////////////////
//////////////////////////////////////////////////////

/**
 *  post one
 *
 * @param req
 * @param res
 */
exports.postOne = function (req, res) {
    try {
        passport.authenticate('local-jwt', {session: false}, function (err, user) {
            if (err) {
                return res.status(500).json("Authentication error")
            }
            if (!user) {
                return res.status(401).json("Incorrect token")
            }
            DetectionRanges.create({
                name: req.body.name,
                fromTime: req.body.fromTime,
                toTime: req.body.toTime,
                daysSelected: req.body.daysSelected,
                userId: user.id,
            }).then(() => {
                return res.status(200).json("ok");
            }).catch((err) => {
                console.log(err);
                return res.status(500).json("something wrong happened");
            });
        })(req, res);
    } catch (e) {
        res.status(500).json(e);
    }
}

exports.getAll = function (req, res) {
    try {
        passport.authenticate('local-jwt', {session: false}, function (err, user) {
            if (err) {
                return res.json({status: 'Authentication error', message: err});
            }
            if (!user) {
                return res.json({status: 'error', message: "Incorrect token"});
            }

            DetectionRanges.findAll({
                attributes: ['name', 'fromTime', 'toTime', 'daysSelected'],
                where: {userId: user.id},
                limit: 100,
                order: sequelize.literal('updatedAt DESC')
            }).then((data) => {
                let ranges = [];
                data.forEach((range) => ranges.push(range));
                res.status(200).json(ranges);
            })
        })(req, res);
    } catch (e) {
        res.status(500).json(e);
    }
}

exports.getCountAll = function (req, res) {
    try {
        passport.authenticate('local-jwt', {session: false}, function (err, user) {
            if (err) {
                return res.json({status: 'Authentication error', message: err});
            }
            if (!user) {
                return res.json({status: 'error', message: "Incorrect token"});
            }
            DetectionRanges.count({
                where: {
                    userId: user.id
                }
            }).then((data) => {
                res.status(200).json(data);
            })
        })(req, res);
    } catch (e) {
        res.status(500).json(e);
    }
};
