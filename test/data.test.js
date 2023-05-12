const chai = require("chai");
const request = require("supertest");
const server = require("../app.js");

const sinon = require("sinon");

const { expect } = chai;

// To Test auto-import, will be mocked
const careLinkImport = require("../utils/careLinkImport.js");

describe("Testing glucose data routes", () => {
	// Initial connection to recover session token
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

	afterEach((done) => {
		sinon.restore();
		done();
	});

	describe("Testing file import", () => {
		it("Making sure we have no glucose data in the DB", async () => {
			let { body, status } = await request(server)
				.delete("/api/data/all")
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(body).to.equal("All data deleted.");
			expect(status).to.equal(200);
		});

		it("Testing import with not supported sensor model", async () => {
			let { body, status } = await request(server)
				.post("/api/data/file")
				.set({ Authorization: `Bearer ${token}` })
				.field("sensorModel", "SensorModel")
				.field("importName", "TestImport")
				.attach("file", "./test/static/testCSV.csv");
			expect(body).to.equal("Sensor model not implemented.");
			expect(status).to.equal(400);
		});

		it("Testing import with no sensor model provided", async () => {
			let { body, status } = await request(server)
				.post("/api/data/file")
				.set({ Authorization: `Bearer ${token}` })
				.field("importName", "TestImport")
				.attach("file", "./test/static/testCSV.csv");
			expect(body).to.equal("No sensor model in the request.");
			expect(status).to.equal(400);
		});

		it("Testing import with no import name provided", async () => {
			let { body, status } = await request(server)
				.post("/api/data/file")
				.set({ Authorization: `Bearer ${token}` })
				.field("sensorModel", "SensorModel")
				.attach("file", "./test/static/testCSV.csv");
			expect(body).to.equal("No import name in the request.");
			expect(status).to.equal(400);
		});

		it("Testing import with no file provided", async () => {
			let { body, status } = await request(server)
				.post("/api/data/file")
				.set({ Authorization: `Bearer ${token}` })
				.field("sensorModel", "minimed")
				.field("importName", "TestImport");
			expect(body).to.equal("No file were uploaded.");
			expect(status).to.equal(400);
		});

		it("Testing import with bad file extension", async () => {
			let { body, status } = await request(server)
				.post("/api/data/file")
				.set({ Authorization: `Bearer ${token}` })
				.field("sensorModel", "minimed")
				.field("importName", "TestImport")
				.attach("file", "./test/static/badFile.txt");
			expect(body).to.equal("Only CSV files are allowed.");
			expect(status).to.equal(400);
		});

		it("Check that no glucose data has been inserted in db", async () => {
			let { body } = await request(server)
				.get(
					"/api/data/getDataInRange?startDate=2023-03-22T10:00:00.000Z&endDate=2023-03-24T10:00:00.000Z"
				)
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(body["glucose"]).to.have.length(0);
		});

		it("Testing import with everything good", async () => {
			let { body, status } = await request(server)
				.post("/api/data/file")
				.set({ Authorization: `Bearer ${token}` })
				.field("sensorModel", "minimed")
				.field("importName", "TestImport")
				.attach("file", "./test/static/testCSV.csv");
			let expectedResponse = { status: "ok", seeDup: 0, seeInsert: 10 };
			expect(body).to.deep.equal(expectedResponse);
			expect(status).to.equal(200);
		});

		it("Check that glucose data and insulin has been inserted in db", async () => {
			let { body } = await request(server)
				.get(
					"/api/data/getDataInRange?startDate=2023-03-14T10:00:00.000Z&endDate=2023-03-16T10:00:00.000Z"
				)
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(body["glucose"]).to.have.length(7);
			expect(body["insulin"]).to.have.length(3);
			console.log(body);
		});

		it("Testing import with data already existing", async () => {
			let { body, status } = await request(server)
				.post("/api/data/file")
				.set({ Authorization: `Bearer ${token}` })
				.field("sensorModel", "minimed")
				.field("importName", "TestImport")
				.attach("file", "./test/static/testCSV.csv");
			let expectedResponse = { status: "ok", seeDup: 10, seeInsert: 0 };
			expect(body).to.deep.equal(expectedResponse);
			expect(status).to.equal(200);
		});

		it("Test to retrieve import names", async () => {
			let { body, status } = await request(server)
				.get("/api/data/importnames")
				.set({ Authorization: `Bearer ${token}` })
				.send({});
			expect(body).to.deep.equal(["TestImport"]);
			expect(status).to.equal(200);
		});
	});

	describe("Testing data auto-import", () => {
		it("Creation of a new auto-import config", async () => {
			let mock = sinon
				.stub(careLinkImport, "testCredential")
				.returns(true);
			let { body, status } = await request(server)
				.post("/api/data/autoImportAccount")
				.set({ Authorization: `Bearer ${token}` })
				.send({
					username: "test123",
					password: "test123",
					country: "BE",
				});
			expect(body).to.equal(
				"Request Received and auto import initialized"
			);
			expect(status).to.equal(200);
			expect(mock.callCount).to.equal(1);
		});

		it("Creation of a config already existing", async () => {
			let mock = sinon
				.stub(careLinkImport, "testCredential")
				.returns(true);
			let { body, status } = await request(server)
				.post("/api/data/autoImportAccount")
				.set({ Authorization: `Bearer ${token}` })
				.send({
					username: "test123",
					password: "test123",
					country: "BE",
				});
			expect(body).to.equal(
				"User already has an account configurated! Use another route to update it."
			);
			expect(status).to.equal(500);
			expect(mock.callCount).to.equal(0);
		});

		it("Creation of a config with bad credentials", async () => {
			let mock = sinon
				.stub(careLinkImport, "testCredential")
				.returns(true);
			let { body, status } = await request(server)
				.post("/api/data/autoImportAccount")
				.set({ Authorization: `Bearer ${token}` })
				.send({
					username: "test123",
					password: "test123",
					country: "BE",
				});
			expect(body).to.equal(
				"User already has an account configurated! Use another route to update it."
			);
			expect(status).to.equal(500);
			expect(mock.callCount).to.equal(0);
		});

		it("Check auto-import config should return 'already configurated'", async () => {
			let { body, status } = await request(server)
				.get("/api/data/autoImportConfiguration")
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(body).to.equal("Auto import already configured.");
			expect(status).to.equal(200);
		});

		it("Test that deleting config works", async () => {
			let { body, status } = await request(server)
				.delete("/api/data/deleteAutoImportConfiguration")
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(body).to.equal("Config deleted");
			expect(status).to.equal(200);
		});

		it("Check auto-import config should return 'not configured'", async () => {
			let { body, status } = await request(server)
				.get("/api/data/autoImportConfiguration")
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(body).to.equal("Auto import not configured.");
			expect(status).to.equal(200);
		});
	});

	describe("Test 'rangeWithNoData' route", () => {
		it("Clearing data from db", async () => {
			let { body, status } = await request(server)
				.delete("/api/data/all")
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(body).to.equal("All data deleted.");
			expect(status).to.equal(200);
		});

		it("Adding data to db", async () => {
			await request(server)
				.post("/api/data/file")
				.set({ Authorization: `Bearer ${token}` })
				.field("sensorModel", "minimed")
				.field("importName", "TestImport")
				.attach("file", "./test/static/testCSV.csv");
		});

		it("Test recover ranges with no data", async () => {
			let { body, status } = await request(server)
				.get("/api/data/rangesWithNoData")
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(body).to.be.ok;
			expect(status).to.equal(200);
		});
	});
});
