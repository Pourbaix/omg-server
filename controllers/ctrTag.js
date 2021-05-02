const Tag = require("../models/modelTag");
const seq = require("../config/config");
const sequelize = seq.sequelize;
const passport = require("../app");

//////////////////////////////////////////////////////
/////////////// Routes controllers ///////////////////
//////////////////////////////////////////////////////

exports.postOne = function (req, res) {
    Tag.create({
        name: req.body.tag,
        startDatetime: req.body.startDatetime,
        endDatetime: req.body.endDatetime,
        userId: req.session.passport.user.id
    }).then(() => {
        return res.status(200).json("ok");
    }).catch((err) => {
        return res.status(500).json("something wrong happened");
    });

}

exports.getRecentTagsFromUserId = function (req, res) {
    try {
        passport.authenticate('local-jwt', {session: false}, function (err, user){
            if (err) { return res.json({status: 'Authentication error', message: err}); }
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
    }catch (e) {
        res.status(500).json(e);
    }
}

exports.getNamesFromUserId = function (req, res) {
    try {
        passport.authenticate('local-jwt', {session: false}, function (err, user){
            if (err) { return res.json({status: 'Authentication error', message: err}); }
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
    }catch (e) {
        res.status(500).json(e);
    }
};

//////////////////////////////////////////////////////
/////////// controllers functions helpers ////////////
//////////////////////////////////////////////////////

exports.getTagsFromName = async function (tagName, userId) {
    try {
        return await Tag.findAll({
            attributes: ['startDatetime'],
            where: {
                userId: userId,
                name: tagName
            }
        });
    } catch (error) {
        return "getTagsFromName request error";
    }
}
