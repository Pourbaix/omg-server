////////////////////////////////////////////////////////////////
////////// Sequelize AutoImportData model (table) //////////////
////////////////////////////////////////////////////////////////

const seq = require("../config/config");
const Sequelize = seq.Sequelize,
	sequelize = seq.sequelize,
	DataTypes = seq.DataTypes;
const User = require("./modelUser");

/**
 * ----------------------
 * modelAutoImportData.js
 * ----------------------
 *
 * This model is used to store auto import configuration, which is composed by:
 * - The id of the corresponding user ("userId"),
 * - The username of the medtronic account ("medtronicUser"),
 * - The password of the medtronic account ("medtronicPassword"),
 * - The country of the medtronic account ("country"),
 * - The username of the target patient => Added due to an API update from CarLink ("patientUsername"),
 * - The last time the auto import has been done for this user => NOT USED ANYMORE ("lastDataUpdate").
 */

const AutoImportData = sequelize.define(
	"autoimportdata",
	{
		userId: {
			type: DataTypes.UUID,
			allowNull: false,
			references: {
				model: User,
				key: "id",
			},
			primaryKey: true,
		},
		medtronicUser: {
			type: DataTypes.TEXT,
			allowNull: false,
			unique: true,
		},
		medtronicPassword: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		country: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		patientUsername: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		lastDataUpdate: {
			type: DataTypes.DATE,
			allowNull: true,
		},
	},
	{
		sequelize,
		modelName: "autoimportdata",
	}
);

module.exports = AutoImportData;
