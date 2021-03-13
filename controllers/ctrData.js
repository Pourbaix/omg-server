const Data = require("../models/modelData");
const seq = require("../config/config");
const Sequelize = seq.Sequelize, sequelize = seq.sequelize;

exports.getOne = function(req, res) {
    Data.findAll({
        where: {
            id: req.params.id
        }
    })
        .then(results => res.json(results[0]))
        .catch(error => res.status(500).json(error));
};
