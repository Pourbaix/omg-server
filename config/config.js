//////////////////////////////////////////////////////
////////// Sequelize initializing file ///////////////
//////////////////////////////////////////////////////
require("dotenv").config();
const { Sequelize, Model, DataTypes, QueryInterface } = require("sequelize");
const db = require("./db"); // database infos file
const env = process.env.NODE_ENV || "development";
const dbInfo = db[env];
const sequelize = new Sequelize(
	dbInfo.database,
	dbInfo.username,
	dbInfo.password,
	{
		dialect: "mariadb",
		port: dbInfo.port,
		host: dbInfo.host,
		// logging: env == "test" || env == "production" ? false : true,
		logging: false,
	}
);
// console.log(sequelize);

sequelize
	.authenticate()
	.then(() => console.log("Connection has been established successfully."))
	.catch((error) =>
		console.error("Unable to connect to the database:", error)
	);

let seq = {};
seq.sequelize = sequelize; // -> instance sequelize
seq.Sequelize = Sequelize; // -> librairy sequelize
seq.Model = Model;
seq.DataTypes = DataTypes;
seq.QueryInterface = QueryInterface;
seq.development = dbInfo;
module.exports = seq;
