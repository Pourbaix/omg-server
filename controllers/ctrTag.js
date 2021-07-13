const Tag = require("../models/modelTag");
const seq = require("../config/config");
const sequelize = seq.sequelize;
const Sequelize = seq.Sequelize;
const passport = require("../app");

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
        if (weekdays.length > 0){
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
