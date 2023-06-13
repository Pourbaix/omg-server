const dateUtils = require("../../utils/dateUtils.js");
// const chai = require("chai");

// const { expect } = chai;

describe("Testing 'hasDST(date: Date, zone: str)' method", () => {
	it("hasDST on BE with a date in summer time should return true", () => {
		expect(
			dateUtils.hasDST(
				new Date("2023-04-26T13:22:30.667Z"),
				"Europe/Brussels"
			)
		).toBeTruthy();
	});

	it("hasDST on BE with a date not in summertime should return false", () => {
		expect(
			dateUtils.hasDST(
				new Date("2023-02-04T13:22:30.667Z"),
				"Europe/Brussels"
			)
		).toBeFalsy();
	});

	it("hasDST in USA with a date not in summertime should return false", () => {
		expect(
			dateUtils.hasDST(
				new Date("2023-11-05T13:22:30.667Z"),
				"America/Los_Angeles"
			)
		).toBeFalsy();
		expect(
			dateUtils.hasDST(
				new Date("2023-12-12T00:00:00.000Z"),
				"America/Los_Angeles"
			)
		).toBeFalsy();
	});

	it("hasDST in USA with a date in summertime should return true", () => {
		expect(
			dateUtils.hasDST(
				new Date("2023-08-04T13:22:30.667Z"),
				"America/Los_Angeles"
			)
		).toBeTruthy();
		expect(
			dateUtils.hasDST(
				new Date("2023-07-25T10:00:00.000Z"),
				"America/Los_Angeles"
			)
		).toBeTruthy();
	});
});

describe("Testing 'normalizedUTC' module", () => {
	it("Verify that offset is correctly canceled", () => {
		if (new Date().getTimezoneOffset() == 0) {
			expect(dateUtils.normalizedUTC(800000)).toBeTruthy();
			expect(dateUtils.normalizedUTC(800000)).toBe(800000);
		} else {
			expect(dateUtils.normalizedUTC(800000)).toBeTruthy();
			expect(dateUtils.normalizedUTC(800000)).toBeLessThan(800000);
		}
	});
});

describe("Testing 'normalizeUTCWithCountry(country: str, date: int)' module", () => {
	it("Verify that offset is applyed correctly in DST period", () => {
		// CHANGE SYSTEM DATE
		jest.useFakeTimers("modern");
		// NEW DATE FOR THE TEST SYSTEM
		jest.setSystemTime(new Date("2023-08-26T00:00:00.000Z"));

		let result = dateUtils.normalizeUTCWithCountry("BE", 0);
		// spy.mockRestore();
		expect(result).toBe(-7200000);
		let msOfTestDate = new Date("2023-08-26T00:00:00.000Z").getTime();
		let targetDate = new Date("2023-08-25T22:00:00.000Z");
		result = dateUtils.normalizeUTCWithCountry("BE", msOfTestDate);

		expect(result).toBe(targetDate.getTime());
		expect(new Date(result).toISOString()).toBe(targetDate.toISOString());
	});
	it("Verify that offset is applyed correctly out of DST period", () => {
		// CHANGE SYSTEM DATE
		jest.useFakeTimers("modern");
		// NEW DATE FOR THE TEST SYSTEM
		jest.setSystemTime(new Date("2023-01-26T00:00:00.000Z"));

		let result = dateUtils.normalizeUTCWithCountry("BE", 0);
		// spy.mockRestore();
		expect(result).toBe(-3600000);
		let msOfTestDate = new Date("2023-08-26T00:00:00.000Z").getTime();
		let targetDate = new Date("2023-08-25T23:00:00.000Z");
		result = dateUtils.normalizeUTCWithCountry("BE", msOfTestDate);

		expect(result).toBe(targetDate.getTime());
		expect(new Date(result).toISOString()).toBe(targetDate.toISOString());
	});
});

describe("Testing 'toNormalizedUTCISOStringWithCountry(country: str, date: int)' module", () => {
	it("Verify that offset is applyed correctly in DST period", () => {
		// CHANGE SYSTEM DATE
		jest.useFakeTimers("modern");
		// NEW DATE FOR THE TEST SYSTEM
		jest.setSystemTime(new Date("2023-08-26T00:00:00.000Z"));

		let result = dateUtils.toNormalizedUTCISOStringWithCountry("BE", 0);
		// spy.mockRestore();
		expect(result).toBe("1969-12-31T22:00:00.000Z");
		let msOfTestDate = new Date("2023-08-26T00:00:00.000Z").getTime();
		let targetDate = new Date("2023-08-25T22:00:00.000Z");
		result = dateUtils.toNormalizedUTCISOStringWithCountry(
			"BE",
			msOfTestDate
		);

		expect(result).toBe(targetDate.toISOString());
	});
	it("Verify that offset is applyed correctly out of DST period", () => {
		// CHANGE SYSTEM DATE
		jest.useFakeTimers("modern");
		// NEW DATE FOR THE TEST SYSTEM
		jest.setSystemTime(new Date("2023-01-26T00:00:00.000Z"));

		let result = dateUtils.toNormalizedUTCISOStringWithCountry("BE", 0);
		// spy.mockRestore();
		expect(result).toBe("1969-12-31T23:00:00.000Z");
		let msOfTestDate = new Date("2023-08-26T00:00:00.000Z").getTime();
		let targetDate = new Date("2023-08-25T23:00:00.000Z");
		result = dateUtils.toNormalizedUTCISOStringWithCountry(
			"BE",
			msOfTestDate
		);

		expect(result).toBe(targetDate.toISOString());
	});
});

describe("Testing 'roundTo5Minutes(date: int)' module", () => {
	it("Testing that it works correctly", () => {
		expect(dateUtils.roundTo5Minutes(32)).toBe(30);
		expect(dateUtils.roundTo5Minutes(57)).toBe(55);
		expect(dateUtils.roundTo5Minutes(3)).toBe(0);
		expect(dateUtils.roundTo5Minutes(7)).toBe(5);
		expect(dateUtils.roundTo5Minutes(29)).toBe(25);
		expect(dateUtils.roundTo5Minutes(31)).toBe(30);
	});
});

describe("Testing 'ISOTo5Minutes(date: ISODate)' module", () => {
	it("Testing that it works correctly", () => {
		expect(dateUtils.ISOTo5Minutes("2023-08-03T23:43:12.000Z")).toBe(
			"2023-08-03T23:40:00.000Z"
		);
		expect(dateUtils.ISOTo5Minutes("2023-08-25T23:19:00.000Z")).toBe(
			"2023-08-25T23:15:00.000Z"
		);
		expect(dateUtils.ISOTo5Minutes("2023-08-12T23:21:47.000Z")).toBe(
			"2023-08-12T23:20:00.000Z"
		);
		expect(dateUtils.ISOTo5Minutes("2023-08-25T20:28:00.000Z")).toBe(
			"2023-08-25T20:25:00.000Z"
		);
		expect(dateUtils.ISOTo5Minutes("2023-08-25T09:17:00.000Z")).toBe(
			"2023-08-25T09:15:00.000Z"
		);
		expect(dateUtils.ISOTo5Minutes("2023-08-25T09:50:00.000Z")).toBe(
			"2023-08-25T09:50:00.000Z"
		);
	});
});
