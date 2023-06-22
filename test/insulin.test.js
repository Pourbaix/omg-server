const chai = require("chai");
const request = require("supertest");
const server = require("../app.js");

const { expect } = chai;

describe("Testing insulin data routes", () => {
	let token;
	before((done) => {
		console.log("Connecting");
		request(server)
			.post("/api/users/signin")
			.send({
				email: "test@test.com",
				password: "test1234",
			})
			.end((err, res) => {
				token = res.body.token;
				done();
			});
	});

	describe("getBolusWithFormattedDateAndTime controller", () => {
		it("Testing retrieving all boluses", async () => {
			let response = await request(server)
				.post("/api/data/file")
				.set({ Authorization: `Bearer ${token}` })
				.field("sensorModel", "minimed")
				.field("importName", "TestImport")
				.attach("file", "./test/static/testCSV.csv");
			let expectedResponse = {
				status: "ok",
				seeDup: 0,
				seeInsert: 10,
				firstDataDatetime: "2023-05-15T06:00:00.000Z",
			};
			expect(response.body).to.deep.equal(expectedResponse);
			expect(response.status).to.equal(200);
			response = await request(server)
				.get(
					"/api/insulin/dateandtime?firstData=2023-05-25T06:00:00.000Z"
				)
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(response.body).to.have.length(3);
		});
		it("Testing retrieving boluses in a period with no data", async () => {
			response = await request(server)
				.get(
					"/api/insulin/dateandtime?firstData=2022-05-25T06:00:00.000Z"
				)
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(response.body).to.have.length(0);
		});
	});
});
