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
 *  post one tag route controller. insert an activation tag.
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
            Tag.create({
                name: req.body.tag,
                startDatetime: req.body.startDatetime,
                endDatetime: req.body.endDatetime,
                userId: user.id
            }).then(() => {
                return res.status(200).json("ok");
            }).catch((err) => {
                return res.status(500).json("something wrong happened");
            });
        })(req, res);
    } catch (e) {
        res.status(500).json(e);
    }
}

/**
 *  put one tag route controller. Edit an activation tag.
 *
 * @param req
 * @param res
 */
exports.putOne = function (req, res) {
    try {
        passport.authenticate('local-jwt', {session: false}, function (err, user) {
            if (err) {
                return res.status(500).json("Authentication error");
            }
            if (!user) {
                return res.status(401).json("Incorrect token");
            }
            if (!"tagName" in req.body) {
                return res.status(401).json("Missing tagName");
            }
            if (!"tagDatetime" in req.body) {
                return res.status(401).json("Missing tagDatetime");
            }
            if (!"tagId" in req.body) {
                return res.status(401).json("Missing tagId");
            }
            Tag.update({name: req.body.tagName, startDatetime: req.body.tagDatetime},{where: {id: req.body.tagId}}).then(() => {
                console.log(req.body);
                return res.status(200).json("tag successfully edited");
            }).catch((err) => {
                return res.status(500).json("something wrong happened while editing a tag: " + err);
            });
        })(req, res);
    } catch (e) {
        res.status(500).json(e);
    }
}

/**
 * get recent tags route controller. Retrieve 8 most recent tags (based on their activation date) of a user.
 *
 * @param req
 * @param res
 */
exports.getRecentTagsFromUserId = function (req, res) {
    try {
        passport.authenticate('local-jwt', {session: false}, function (err, user) {
            if (err) {
                return res.json({status: 'Authentication error', message: err});
            }
            if (!user) {
                return res.json({status: 'error', message: "Incorrect token"});
            }
            Tag.findAll({
                where: {
                    userId: user.id
                },
                limit: 8,
                order: sequelize.literal('startDatetime DESC'),
                attributes: [[sequelize.fn('DISTINCT', sequelize.col('name')), 'name']]
            }).then((data) => {
                let tags = [];
                data.forEach((tag) => tags.push(tag['name']));
                res.status(200).json(tags);
            })
        })(req, res);
    } catch (e) {
        res.status(500).json(e);
    }
}

/**
 * get all tags route controller. Retrieve all the tags of a user
 *
 * @param req
 * @param res
 */
exports.getNamesFromUserId = function (req, res) {
    try {
        passport.authenticate('local-jwt', {session: false}, function (err, user) {
            if (err) {
                return res.json({status: 'Authentication error', message: err});
            }
            if (!user) {
                return res.json({status: 'error', message: "Incorrect token"});
            }
            Tag.findAll({
                where: {
                    userId: user.id
                },
                attributes: [[sequelize.fn('DISTINCT', sequelize.col('name')), 'name']]
            }).then((data) => {
                let tags = [];
                data.forEach((tag) => tags.push(tag['name']));
                res.status(200).json(tags);
            })
        })(req, res);
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
        passport.authenticate('local-jwt', {session: false}, function (err, user) {
            if (err) {
                return res.json({status: 'Authentication error', message: err});
            }
            if (!user) {
                return res.json({status: 'error', message: "Incorrect token"});
            }
            if (!"datetimeBegin" in req.query) {
                return res.json({status: 'error', message: "missing datetimeBegin"});
            }

            let datetime = new Date(req.query.datetimeBegin);

            Tag.findAll({
                attributes: ['name', 'startDatetime', 'updatedAt', 'id'],
                where: {
                    [Op.and]: [
                        {userId: user.id},
                        {
                            updatedAt: {
                                [Op.lt]: datetime.toISOString()
                            }
                        }
                    ]
                },
                limit: 10,
                order: sequelize.literal('updatedAt DESC')
            }).then((data) => {
                let tags = [];
                data.forEach((tag) => tags.push(tag));
                res.status(200).json(tags);
            })
        })(req, res);
    } catch (e) {
        res.status(500).json(e);
    }
}

/**
 * get the count of all tag activations
 *
 * @param req
 * @param res
 */
exports.getCountAllActivations = function (req, res) {
    try {
        passport.authenticate('local-jwt', {session: false}, function (err, user) {
            if (err) {
                return res.json({status: 'Authentication error', message: err});
            }
            if (!user) {
                return res.json({status: 'error', message: "Incorrect token"});
            }
            Tag.count({
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
exports.getTagsFromName = async function (tagName, userId, fromToDate = null, weekdays) {
    try {
        let reqObject = {
            attributes: ['startDatetime'],
            where: {
                userId: userId,
                name: tagName
            }
        };
        if (fromToDate) {
            reqObject.where['startDatetime'] = {
                [Sequelize.Op.between]: [new Date(fromToDate[0]), new Date(fromToDate[1])]
            };
        }
        let res = await Tag.findAll(reqObject);
        if (weekdays.length > 0) {
            res = res.filter(tag => weekdays.includes(new Date(tag.dataValues.startDatetime).getDay()))
            // let results = res.map(tag => new Date(tag.dataValues.startDatetime).getDay());
            // results = results.map(tag => parseInt(tag));
            // console.log(results)
            // console.log(results.filter(tag => weekdays.includes(tag)));
        }

        return res;
    } catch (error) {
        return "getTagsFromName request error";
    }
}
