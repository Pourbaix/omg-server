////////////////////////////////////////////////////////////////
////////// Sequelize AutoImportData model (table) //////////////
////////////////////////////////////////////////////////////////

const seq = require("../config/config");
const Sequelize = seq.Sequelize,
	sequelize = seq.sequelize,
	DataTypes = seq.DataTypes;
const User = require("./modelUser");

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
