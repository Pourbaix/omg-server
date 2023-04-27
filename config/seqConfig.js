require("dotenv").config();
module.exports = {
	development: {
		username: process.env.DB_USERNAME,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_DATABASE,
		host: process.env.DB_HOST,
		port: process.env.DB_PORT,
		dialect: "mariadb",
	},
	test: {
		username: process.env.TEST_DB_USERNAME,
		password: process.env.TEST_DB_PASSWORD,
		database: process.env.TEST_DB_DATABASE,
		host: process.env.DB_HOST,
		port: process.env.TEST_DB_PORT,
		dialect: "mariadb",
	},
	production: {
		username: process.env.DB_USERNAME,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_DATABASE,
		host: process.env.DB_HOST,
		dialect: "mariadb",
	},
};
