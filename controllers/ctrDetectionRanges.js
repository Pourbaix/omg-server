const DetectionRanges = require("../models/modelDetectionRanges");
const Bolus = require("../models/modelBolus");
const User = require("../models/modelUser");
const Tag = require("../models/modelTag");
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

exports.putOne = function (req, res) {
    try {
        passport.authenticate('local-jwt', {session: false}, function (err, user) {
            if (err) {
                return res.status(500).json("Authentication error")
            }
            if (!user) {
                return res.status(401).json("Incorrect token")
            }
            DetectionRanges.update({
                name: req.body.rangeName,
                fromTime: req.body.rangeFrom,
                toTime: req.body.rangeTo,
                daysSelected: req.body.rangeDaysSelected,
            }, {where: {id: req.body.rangeId}}).then(() => {
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

exports.deleteOneRange = async function (req, res) {
    try {
        passport.authenticate('local-jwt', {session: false}, async function (err, user) {
            if (err) {
                return res.json({status: 'Authentication error', message: err});
            }
            if (!user) {
                return res.json({status: 'error', message: "Incorrect token"});
            }
            if (!req.body.rangeId) {
                return res.status(401).json("Missing rangeId");
            }
            let response = await DetectionRanges.destroy({
                where: {
                    userId: user.id,
                    id: req.body.rangeId
                }
            });
            res.status(200).json("Range " + req.body.rangeId + " deleted.");
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
                attributes: ['name', 'fromTime', 'toTime', 'daysSelected', 'id'],
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

exports.RangesWithFormattedTimes = function (req, res) {
    try {
        passport.authenticate('local-jwt', {session: false}, function (err, user) {
            if (err) {
                return res.json({status: 'Authentication error', message: err});
            }
            if (!user) {
                return res.json({status: 'error', message: "Incorrect token"});
            }

            DetectionRanges.findAll({
                attributes: ['name',
                    [sequelize.fn('time_format', sequelize.col('fromTime'), '%H:%i'), 'fromTime'],
                    [sequelize.fn('time_format', sequelize.col('toTime'), '%H:%i'), 'toTime'],
                    'daysSelected'],
                where: {userId: user.id},
                limit: 100,
                order: sequelize.literal('updatedAt DESC')
            }).then((ranges) => {
                let cleanedRangesData = [];
                ranges.forEach((range, index) => {
                    let name = range.dataValues.name;
                    let from = range.dataValues.fromTime;
                    let to = range.dataValues.toTime;
                    let days = range.dataValues.daysSelected;
                    console.log(days.toString(2));
                    let bitDays = days.toString(2);
                    let daysConverter = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
                    let daysNumbers = [];
                    let j = 0;
                    for (let i = bitDays.length; i > 0; i--) {
                        // console.log(bitDays[i-1]);
                        if (bitDays[i - 1] == "1") {
                            daysConverter[j] = bitDays[i - 1];
                            daysNumbers.push(j);
                        }
                        j++;
                    }
                    console.log(daysConverter);
                    console.log(daysNumbers);
                    cleanedRangesData.push({name: name, from: from, to: to, daysNumbers: daysNumbers})
                });
                res.status(200).json(cleanedRangesData);
            });
        })(req, res);
    } catch (e) {
        res.status(500).json(e);
    }
}

exports.detectEventInRange = function (req, res) {
    // getPendingTags(req, res).then((pendingTags) => res.status(200).json(pendingTags));
    let pendingTagsFromFunction = getPendingTags(req, res).then(()=>console.log("ok synchronisé"));
    console.log("----------------"+pendingTagsFromFunction);
    // getPendingTags(req, res).then((pendingTags) => {
    //     console.log(typeof pendingTags);
    //     res.status(200).json({ok: 'ok', pendingTags: pendingTags});
    // });
}

// helpers

async function getPendingTags(req, res){
    try {
        passport.authenticate('local-jwt', {session: false}, function (err, user) {
            if (err) {
                return res.json({status: 'Authentication error', message: err});
            }
            if (!user) {
                return res.json({status: 'error', message: "Incorrect token"});
            }
            let pendingTags = [];
            return DetectionRanges.findAll({
                attributes: ['name',
                    [sequelize.fn('time_format', sequelize.col('fromTime'), '%H:%i'), 'fromTime'],
                    [sequelize.fn('time_format', sequelize.col('toTime'), '%H:%i'), 'toTime'],
                    'daysSelected'],
                where: {userId: user.id},
                limit: 100,
                order: sequelize.literal('updatedAt DESC')
            }).then((data) => {
                data.forEach((res) => {
                    // console.log(res.dataValues);
                    // console.log(res.dataValues.fromTime);
                    // console.log(res.dataValues.toTime);
                    let name = res.dataValues.name;
                    let from = res.dataValues.fromTime;
                    let to = res.dataValues.toTime;
                    let days = res.dataValues.daysSelected;
                    Bolus.findAll({
                        attributes: [
                            [sequelize.fn('time_format', sequelize.col('datetime'), '%H:%i'), 'extractedTime'],
                            [sequelize.fn('date_format', sequelize.col('datetime'), '%Y-%m-%d'), 'extractedDate'],
                        ],
                        where: {
                            [Op.and]: [
                                {userId: user.id},
                                // {[Op.between]: [res.dataValues.fromTime, res.dataValues.toTime]},
                            ]
                        },
                        limit: 10000,
                        order: sequelize.literal('updatedAt DESC')
                    }).then((data) => {
                        console.log(days.toString(2));
                        let bitDays = days.toString(2);
                        let daysNumbers = [];
                        let daysConverter = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
                        let j = 0;
                        for(let i = bitDays.length; i > 0; i--){
                            // console.log(bitDays[i-1]);
                            if(bitDays[i-1] == "1"){
                                daysConverter[j] = bitDays[i-1];
                                daysNumbers.push(j);
                            }
                            j++;
                        }
                        console.log(daysConverter);
                        console.log(daysNumbers);
                        // let count = 0;
                        // let pendingTags = [{pendingName: name, pendingDatetime: datetime}];
                        data.forEach((res,i) => {
                            // console.log(res.dataValues);
                            // console.log(res.dataValues.extractedDate);
                            // console.log(res.dataValues.extractedTime);
                            let date = res.dataValues.extractedDate;
                            let time = res.dataValues.extractedTime;
                            // console.log(typeof time); // string
                            if(time >= from && time <= to){
                                // console.log(time); //time is one of the values to insert into Tag
                                // date.getDay()
                                if(daysNumbers.includes(new Date(date).getDay())){
                                    // console.log("final match:\ndate: "+ date + " time: "+ time + " nom: "+ name);
                                    // console.log("final match:\ndatetimeRounded: "+ roundTo5Minutes(new Date(date+"T"+time)) + " nom: "+ name);
                                    const datetime = roundTo5MinutesAndAddSummerTime(new Date(date+"T"+time));
                                    let pendingTag = {};
                                    pendingTag.pendingName = name;
                                    pendingTag.pendingDatetime = datetime;
                                    pendingTags.push(pendingTag);
                                    // console.log(pendingTags);
                                }
                            }
                            // console.log(days.toString(2)); // max 111 1111
                            // count++;
                        });
                        console.log(pendingTags);
                        // console.log("nbre de lignes dans bolus: "+count);

                        // pendingTags.forEach((pendingTag) => {
                        //     Tag.create({
                        //         name: pendingTag.name,
                        //         startDatetime: pendingTag.datetime,
                        //         endDatetime: pendingTag.datetime,
                        //         userId: user.id,
                        //         isPending: true,
                        //         wasAuto: true,
                        //     }).then(() => {
                        //         return res.status(200).json("ok");
                        //     }).catch((err) => {
                        //         return res.status(500).json("something wrong happened");
                        //     });
                        // });

                    });
                    // let pendingTags = [];
                    // data.forEach((pendingTag) => pendingTags.push(pendingTag));
                    // res.status(200).json(pendingTags);
                });
                // res.status(200).json({ok: 'ok', });
                return pendingTags;
            });
        })(req, res);
    } catch (e) {
        res.status(500).json(e);
    }

}


function roundTo5MinutesAndAddSummerTime(date) {
    let coeff = 1000 * 60 * 5;
    let rounded = new Date(Math.round(date.getTime() / coeff) * coeff);

    return new Date(rounded.setHours(rounded.getHours()+1));
}
