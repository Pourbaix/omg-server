"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
	async up(queryInterface, Sequelize) {
		/**
		 * Add seed commands here.
		 *
		 * Example:
		 * await queryInterface.bulkInsert('People', [{
		 *   name: 'John Doe',
		 *   isBetaMember: false
		 * }], {});
		 */
		await queryInterface.bulkInsert("users", [
			{
				id: uuidv4(),
				firstName: "testUser",
				lastName: "testUser",
				email: "test@test.com",
				password:
					"H6hEcpSSeFP2SrEGAWj49oVuxewvFBJA8hBxDw2kOQurFFdLqkr+AlNC6v+jkyT0lbJNHsv/oQ4H9HUeRTRc3Q==",
				salt: "ad220f4744798549a5010e027acb9c45d26880afc31a175aec10595796805749ee4b07adeb4d0d56b760e5b94f6adf5e12e68447867a207238061bfb5c07e7a4",
				createdAt: new Date(),
				updatedat: new Date(),
			},
		]);
	},

	async down(queryInterface, Sequelize) {
		/**
		 * Add commands to revert seed here.
		 *
		 * Example:
		 * await queryInterface.bulkDelete('People', null, {});
		 */
		await queryInterface.bulkDelete("user", null, {});
	},
};
