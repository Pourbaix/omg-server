require("dotenv").config();
const User = require("./models/modelUser");
const GlocuseData = require("./models/modelGlucoseData");
const AutoImportData = require("./models/modelAutoImportData");
const careLinkImport = require("./careLinkImport.js");

//////////IMPORT SEQUELIZE TO MAKE QUERY//////////////
const seq = require("./config/config");
console.log("seq established");
/////////////////////////////////////////////////////

async function autoImport(userId) {
	console.log("Executing Auto Import for user: " + userId);
	if (!userId) {
		return -1;
	}
	let userInfo = await AutoImportData.findOne({
		where: { userId: userId },
	}).catch((err) => {
		return err;
	});

	let data = await careLinkImport.getLast24DataObject(
		userInfo.dataValues.medtronicUser,
		userInfo.dataValues.medtronicPassword,
		userInfo.dataValues.country
	);
	let lastDataImportedFormated = new Date(userInfo.lastDataUpdate).getTime();
	console.log(new Date(lastDataImportedFormated));
	let glucoseData = data["sgs"];
	let pumpSerial = data["medicalDeviceSerialNumber"];
	let importName = "AUTO-IMPORTED";
	let lastDatetimeImport = userInfo.lastDataUpdate;

	// console.log(glucoseData);
	for (let i in glucoseData) {
		if (glucoseData[i].datetime) {
			let formatedDate = new Date(glucoseData[i].datetime).getTime();
			if (formatedDate > lastDataImportedFormated) {
				GlocuseData.create({
					datetime: glucoseData[i].datetime,
					glucose: parseInt(glucoseData[i].sg),
					pumpSN: pumpSerial,
					importName: importName,
					userId: userId,
				}).catch();
				lastDatetimeImport = glucoseData[i].datetime;
			}
		}
	}

	// console.log(lastDatetimeImport);
	AutoImportData.update(
		{ lastDataUpdate: lastDatetimeImport },
		{ where: { userId: userId } }
	).catch((err) => {
		return err;
	});

	/////////////CLOSE SEQ CONNECTION////////////////////
	// await seq.sequelize.close();
	/////////////////////////////////////////////////////
	return 1;
}
async function autoImportAllUsers() {
	let userList = await AutoImportData.findAll({ attributes: ["userId"] });
	// console.log(userList);
	for (let item in userList) {
		// console.log(item);
		console.log("userId n°: " + userList[item].dataValues.userId);
		await autoImport(userList[item].dataValues.userId).catch((err) => {
			return err;
		});
	}
	return 1;
}

module.exports = {
	autoImport,
	autoImportAllUsers,
};
