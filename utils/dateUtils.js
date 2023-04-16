const ct = require("countries-and-timezones");

// Check if we are in day light saving period or not (summer time or not)
function hasDST(date = new Date()) {
	const january = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
	const july = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();

	return Math.max(january, july) !== date.getTimezoneOffset();
}

function normalizedUTC(date) {
	// Used to cancel the Offset of the server
	let offset = new Date().getTimezoneOffset() * 60000;
	let newDateMs = date + offset;
	return newDateMs;
}

function normalizeUTCWithCountry(country, date) {
	// Used to cancel the Offset of the datas from the Carelink API
	// The offest is set by Carelink based on the country code
	let timezone = ct.getTimezonesForCountry(country);
	let offset = "";
	if (hasDST(new Date())) {
		offset = timezone[0].dstOffset * 60000;
	} else {
		offset = timezone[0].utcOffset * 60000;
	}
	let newDateMs = date - offset;
	return newDateMs;
}

function toNormalizedUTCISOStringWithCountry(country, date) {
	// Takes an ISO String as input and return the ISO String at UTC:0
	let oldTimeMs = new Date(date).getTime();
	let newTimeMs = normalizeUTCWithCountry(country, oldTimeMs);
	let newIso = new Date(date);
	newIso.setTime(newTimeMs);
	return newIso.toISOString();
}

function roundTo5Minutes(date) {
	if (date % 5 == 0) {
		return date;
	}
	let minutesList = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
	let roundedTime = 0;
	for (let i in minutesList) {
		if (minutesList[i] < date) {
			roundedTime = minutesList[i];
		} else {
			return roundedTime;
		}
	}
	return roundedTime;
}

function ISOTo5Minutes(ISODate) {
	let newDate = new Date(ISODate);
	let minutes = newDate.getMinutes();
	let newMinutes = roundTo5Minutes(minutes);
	newDate.setMinutes(newMinutes);
	newDate.setSeconds(0);
	return newDate.toISOString();
}

module.exports = {
	normalizedUTC,
	normalizeUTCWithCountry,
	toNormalizedUTCISOStringWithCountry,
	roundTo5Minutes,
	ISOTo5Minutes,
};
