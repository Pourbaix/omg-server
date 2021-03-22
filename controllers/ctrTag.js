const Tag = require("../models/modelTag");
const seq = require("../config/config");
const Sequelize = seq.Sequelize, sequelize = seq.sequelize;

exports.getOne = function (req, res) {
    Tag.findAll({
        where: {
            id: req.params.id
        }
    })
        .then(results => res.json(results[0]))
        .catch(error => res.status(500).json(error));
};

exports.postOne = function (req, res) {
    Tag.create({
        name: req.body.tag,
        startDatetime: req.body.startDatetime,
        endDatetime: req.body.endDatetime,
        userId: req.body.userId
    });
    return res.status(200).json("ok");
}

exports.getTagsFromName = async function (tagName, userId) {
    try {
        const tags = await Tag.findAll({
            attributes: ['startDatetime'],
            where: {
                userId: userId,
                name: tagName
            }
        })
        return tags;
    } catch (error) {
        return "getTagsFromName request error";
    }
}
