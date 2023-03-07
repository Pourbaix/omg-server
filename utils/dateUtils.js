const ct = require("countries-and-timezones");

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
	let offset = timezone[0].utcOffset * 60000;
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

module.exports = {
	normalizedUTC,
	normalizeUTCWithCountry,
	toNormalizedUTCISOStringWithCountry,
};
