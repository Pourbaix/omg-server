const DetectionRanges = require("../models/modelDetectionRanges");
const Bolus = require("../models/modelBolus");
const User = require("../models/modelUser");
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

exports.detectEventInRange = function (req, res) {
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
            }).then((data) => {
                data.forEach((res) => {
                    // console.log(res.dataValues);
                    // console.log(res.dataValues.fromTime);
                    // console.log(res.dataValues.toTime);
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
                        data.forEach((res) => {
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
                                    console.log("final match:\ndate: "+ date + "\ntime: "+ time)
                                }
                            }
                            // console.log(days.toString(2)); // max 111 1111
                            // count++;
                        });
                        // console.log("nbre de lignes dans bolus: "+count);
                    });

                    // let pendingTags = [];
                    // data.forEach((pendingTag) => pendingTags.push(pendingTag));
                    // res.status(200).json(pendingTags);
                });
            });
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

function slowAndOvercomplicatedFilter(days){
    let stringDays = [];
    // days could be 127, 63, 31, 15, 7, 3, 1, ...
    // 67 return 0
    if(days-64 > 0){
        stringDays.push(0); //sunday
        if(days-32 > 0){
            stringDays.push(6); //saturday
            if(days-16 > 0){
                stringDays.push(5); //friday
                if(days-8 > 0){
                    stringDays.push(4); //thursday
                    if(days-4 > 0){
                        stringDays.push(3); //wednesday
                        if(days-2 > 0){
                            stringDays.push(2); //tuesday
                            if(days-1 === 0){
                                stringDays.push(1); //monday
                            }
                        }
                    }
                }
            }
        }
    }
    else if(days-32 > 0){
        stringDays.push(6); //saturday
        if(days-48 > 0){
            stringDays.push(5); //friday
            if(days-56 > 0){
                stringDays.push(4); //thursday
                if(days-60 > 0){
                    stringDays.push(3); //wednesday
                    if(days-62 > 0){
                        stringDays.push(2); //tuesday
                        if(days-63 === 0){
                            stringDays.push(1); //monday
                        }
                    }
                }
            }
        }
    }
    else if(days-16 > 0){
        stringDays.push(5); //friday
        if(days-24 > 0){
            stringDays.push(4); //thursday
            if(days-28 > 0){
                stringDays.push(3); //wednesday
                if(days-30 > 0){
                    stringDays.push(2); //tuesday
                    if(days-31 === 0){
                        stringDays.push(1); //monday
                    }
                }
            }
        }
    }
    else if(days-8 > 0){
        stringDays.push(4); //thursday
        if(days-12 > 0){
            stringDays.push(3); //wednesday
            if(days-14 > 0){
                stringDays.push(2); //tuesday
                if(days-15 === 0){
                    stringDays.push(1); //monday
                }
            }
        }
    }
    else if(days-4 > 0){
        stringDays.push(3); //wednesday
        if(days-6 > 0){
            stringDays.push(2); //tuesday
            if(days-7 === 0){
                stringDays.push(1); //monday
            }
        }
    }
    else if(days-2 > 0){
        stringDays.push(2); //tuesday
        if(days-1 === 0){
            stringDays.push(1); //monday
        }
    }
    else if(days-1 === 0){
        stringDays.push(1); //monday
    }
    console.log(stringDays);
}
