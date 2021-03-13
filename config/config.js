const {Sequelize, Model, DataTypes, QueryInterface} = require("sequelize");
const db = require("./db");
const sequelize = new Sequelize(db);

sequelize.authenticate()
    .then(() => console.log('Connection has been established successfully.'))
    .catch((error) => console.error('Unable to connect to the database:', error));

let seq  = {};
seq.sequelize = sequelize; // -> instance sequelize
seq.Sequelize = Sequelize; // -> librairy sequelize
seq.Model = Model;
seq.DataTypes = DataTypes;
seq.QueryInterface = QueryInterface;
module.exports = seq;
