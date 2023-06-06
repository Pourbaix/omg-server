const chai = require("chai");
const request = require("supertest");
const server = require("../app.js");

const sinon = require("sinon");

const { expect } = chai;

const GlocuseData = require("../models/modelGlucoseData");
const Insulin = require("../models/modelInsulin");
const AutoImportData = require("../models/modelAutoImportData");

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
		GlocuseData.destroy({ truncate: true });
		Insulin.destroy({ truncate: true });
		AutoImportData.destroy({ truncate: true });
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
			let response = await request(server)
				.post("/api/data/file")
				.set({ Authorization: `Bearer ${token}` })
				.field("sensorModel", "SensorModel")
				.field("importName", "TestImport")
				.attach("file", "./test/static/testCSV.csv");
			expect(response.body).to.equal("Sensor model not implemented.");
			expect(response.status).to.equal(400);
			// Checking that nothing has been inserted
			response = await request(server)
				.get(
					"/api/data/getDataInRange?startDate=2023-03-22T10:00:00.000Z&endDate=2023-03-24T10:00:00.000Z"
				)
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(response.body["glucose"]).to.have.length(0);
		});

		it("Testing import with no sensor model provided", async () => {
			let response = await request(server)
				.post("/api/data/file")
				.set({ Authorization: `Bearer ${token}` })
				.field("importName", "TestImport")
				.attach("file", "./test/static/testCSV.csv");
			expect(response.body).to.equal("No sensor model in the request.");
			expect(response.status).to.equal(400);
			// Checking that nothing has been inserted
			response = await request(server)
				.get(
					"/api/data/getDataInRange?startDate=2023-03-22T10:00:00.000Z&endDate=2023-03-24T10:00:00.000Z"
				)
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(response.body["glucose"]).to.have.length(0);
		});

		it("Testing import with no import name provided", async () => {
			let response = await request(server)
				.post("/api/data/file")
				.set({ Authorization: `Bearer ${token}` })
				.field("sensorModel", "SensorModel")
				.attach("file", "./test/static/testCSV.csv");
			expect(response.body).to.equal("No import name in the request.");
			expect(response.status).to.equal(400);
			// Checking that nothing has been inserted
			response = await request(server)
				.get(
					"/api/data/getDataInRange?startDate=2023-03-22T10:00:00.000Z&endDate=2023-03-24T10:00:00.000Z"
				)
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(response.body["glucose"]).to.have.length(0);
		});

		it("Testing import with no file provided", async () => {
			let response = await request(server)
				.post("/api/data/file")
				.set({ Authorization: `Bearer ${token}` })
				.field("sensorModel", "minimed")
				.field("importName", "TestImport");
			expect(response.body).to.equal("No file were uploaded.");
			expect(response.status).to.equal(400);
			// Checking that nothing has been inserted
			response = await request(server)
				.get(
					"/api/data/getDataInRange?startDate=2023-03-22T10:00:00.000Z&endDate=2023-03-24T10:00:00.000Z"
				)
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(response.body["glucose"]).to.have.length(0);
		});

		it("Testing import with bad file extension", async () => {
			let response = await request(server)
				.post("/api/data/file")
				.set({ Authorization: `Bearer ${token}` })
				.field("sensorModel", "minimed")
				.field("importName", "TestImport")
				.attach("file", "./test/static/badFile.txt");
			expect(response.body).to.equal("Only CSV files are allowed.");
			expect(response.status).to.equal(400);
			// Checking that nothing has been inserted
			response = await request(server)
				.get(
					"/api/data/getDataInRange?startDate=2023-03-22T10:00:00.000Z&endDate=2023-03-24T10:00:00.000Z"
				)
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(response.body["glucose"]).to.have.length(0);
		});

		it("Testing import with everything good", async () => {
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
			//Checking that glucose data and insulin have been inserted to db
			response = await request(server)
				.get(
					"/api/data/getDataInRange?startDate=2023-03-14T10:00:00.000Z&endDate=2023-05-16T10:00:00.000Z"
				)
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(response.body["glucose"]).to.have.length(7);
			expect(response.body["insulin"]).to.have.length(3);
		});

		it("Testing import with data already existing", async () => {
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
				.post("/api/data/file")
				.set({ Authorization: `Bearer ${token}` })
				.field("sensorModel", "minimed")
				.field("importName", "TestImport")
				.attach("file", "./test/static/testCSV.csv");
			expectedResponse = {
				status: "ok",
				seeDup: 10,
				seeInsert: 0,
				firstDataDatetime: "2023-05-15T06:00:00.000Z",
			};
			expect(response.body).to.deep.equal(expectedResponse);
			expect(response.status).to.equal(200);
		});

		it("Test to retrieve import names", async () => {
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
				.get("/api/data/importnames")
				.set({ Authorization: `Bearer ${token}` })
				.send({});
			expect(response.body).to.deep.equal(["TestImport"]);
			expect(response.status).to.equal(200);
		});
	});

	describe("Testing data auto-import", () => {
		it("Creation of a new auto-import config", async () => {
			let mock = sinon
				.stub(careLinkImport, "testCredential")
				.returns(true);
			let response = await request(server)
				.post("/api/data/autoImportAccount")
				.set({ Authorization: `Bearer ${token}` })
				.send({
					username: "test123",
					password: "test123",
					country: "BE",
					patientUsername: "test",
				});
			expect(response.body).to.equal(
				"Request Received and auto import initialized"
			);
			expect(response.status).to.equal(201);
			expect(mock.callCount).to.equal(1);
		});

		it("Creation of a config already existing", async () => {
			let mock = sinon
				.stub(careLinkImport, "testCredential")
				.returns(true);

			let response = await request(server)
				.post("/api/data/autoImportAccount")
				.set({ Authorization: `Bearer ${token}` })
				.send({
					username: "test123",
					password: "test123",
					country: "BE",
					patientUsername: "test",
				});
			expect(response.body).to.equal(
				"Request Received and auto import initialized"
			);
			expect(response.status).to.equal(201);
			expect(mock.callCount).to.equal(1);

			response = await request(server)
				.post("/api/data/autoImportAccount")
				.set({ Authorization: `Bearer ${token}` })
				.send({
					username: "test123",
					password: "test123",
					country: "BE",
					patientUsername: "test",
				});
			expect(response.body).to.equal(
				"User already has an account configurated! Use another route to update it."
			);
			expect(response.status).to.equal(500);
			expect(mock.callCount).to.equal(1);
		});

		it("Creation of a config with bad credentials", async () => {
			let mock = sinon
				.stub(careLinkImport, "testCredential")
				.throws("Bad credentials");
			let response = await request(server)
				.post("/api/data/autoImportAccount")
				.set({ Authorization: `Bearer ${token}` })
				.send({
					username: "test123",
					password: "test123",
					country: "BE",
					patientUsername: "test",
				});
			expect(mock.callCount).to.equal(1);
			expect(response.body).to.equal(
				"Provided credentials are not correct"
			);
			expect(response.status).to.equal(500);
		});

		it("Check auto-import config should return 'already configurated'", async () => {
			let mock = sinon
				.stub(careLinkImport, "testCredential")
				.returns(true);
			let response = await request(server)
				.post("/api/data/autoImportAccount")
				.set({ Authorization: `Bearer ${token}` })
				.send({
					username: "test123",
					password: "test123",
					country: "BE",
					patientUsername: "test",
				});
			expect(response.body).to.equal(
				"Request Received and auto import initialized"
			);
			expect(response.status).to.equal(201);
			expect(mock.callCount).to.equal(1);

			response = await request(server)
				.get("/api/data/autoImportConfiguration")
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(response.body).to.equal("Auto import already configured.");
			expect(response.status).to.equal(200);
		});

		it("Test that deleting config works", async () => {
			let mock = sinon
				.stub(careLinkImport, "testCredential")
				.returns(true);
			let response = await request(server)
				.post("/api/data/autoImportAccount")
				.set({ Authorization: `Bearer ${token}` })
				.send({
					username: "test123",
					password: "test123",
					country: "BE",
					patientUsername: "test",
				});
			expect(response.body).to.equal(
				"Request Received and auto import initialized"
			);
			expect(response.status).to.equal(201);
			expect(mock.callCount).to.equal(1);

			response = await request(server)
				.delete("/api/data/deleteAutoImportConfiguration")
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(response.body).to.equal("Config deleted");
			expect(response.status).to.equal(200);

			response = await request(server)
				.get("/api/data/autoImportConfiguration")
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(response.body).to.equal("Auto import not configured.");
			expect(response.status).to.equal(200);
		});
	});

	describe("Test 'rangeWithNoData' route", () => {
		it("Recovering 'ranges with no data' with holes in data", async () => {
			let response = await request(server)
				.delete("/api/data/all")
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(response.body).to.equal("All data deleted.");
			expect(response.status).to.equal(200);

			response = await request(server)
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
				.get("/api/data/rangesWithNoData")
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(response.body).to.be.ok;
			expect(response.status).to.equal(200);
		});
	});
});
