"use strict";

module.exports = {
	async up(queryInterface, Sequelize) {
		return queryInterface.sequelize.transaction((t) => {
			return Promise.all([
				queryInterface.createTable(
					"autoimportdata",
					{
						userId: {
							type: Sequelize.DataTypes.UUID,
							allowNull: false,
							references: {
								model: {
									tableName: "users",
								},
								key: "id",
							},
							primaryKey: true,
						},
						medtronicUser: {
							type: Sequelize.DataTypes.TEXT,
							allowNull: false,
							primaryKey: true,
						},
						medtronicPassword: {
							type: Sequelize.DataTypes.TEXT,
							allowNull: false,
						},
						country: {
							type: Sequelize.DataTypes.TEXT,
							allowNull: false,
						},
						lastDataUpdate: {
							type: Sequelize.DataTypes.DATE,
							allowNull: true,
						},
					},
					{ transaction: t }
				),
			]);
		});
	},

	async down(queryInterface, Sequelize) {
		return queryInterface.sequelize.transaction((t) => {
			return Promise.all([
				queryInterface.dropTable("autoimportdata", { transaction: t }),
			]);
		});
	},
};
