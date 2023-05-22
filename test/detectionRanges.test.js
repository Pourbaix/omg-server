const chai = require("chai");
const request = require("supertest");
const server = require("../app.js");

const { expect } = chai;

const DetectionRanges = require("../models/modelDetectionRanges");

describe("Testing dectionRanges routes", () => {
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
	afterEach(async () => {
		// Deleting created entries after each test
		await DetectionRanges.destroy({ truncate: true });
	});

	describe("Test creating a detection range", () => {
		it("Range creation with no errors", async () => {
			let response = await request(server)
				.get("/api/ranges/all")
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(response.status).to.equal(200);
			expect(response.body.length).to.equal(0);
			response = await request(server)
				.post("/api/ranges/one")
				.set({ Authorization: `Bearer ${token}` })
				.send({
					name: "testDetectionRange1",
					fromTime: "10:00",
					toTime: "13:00",
					daysSelected: 127,
				});
			expect(response.status).to.equal(200);
			expect(response.body).to.equal("ok");
			response = await request(server)
				.get("/api/ranges/all")
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(response.status).to.equal(200);
			expect(response.body.length).to.equal(1);
			response = await request(server)
				.get("/api/ranges/countAll")
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(response.status).to.equal(200);
			expect(response.body).to.equal(1);
		});

		it("Range creation with name already existing", async () => {
			// Creating the original entry
			let response = await request(server)
				.post("/api/ranges/one")
				.set({ Authorization: `Bearer ${token}` })
				.send({
					name: "testDetectionRange1",
					fromTime: "10:00",
					toTime: "13:00",
					daysSelected: 127,
				});
			expect(response.status).to.equal(200);
			expect(response.body).to.equal("ok");
			// Trying to create a duplicate
			response = await request(server)
				.post("/api/ranges/one")
				.set({ Authorization: `Bearer ${token}` })
				.send({
					name: "testDetectionRange1",
					fromTime: "10:00",
					toTime: "13:00",
					daysSelected: 127,
				});
			expect(response.status).to.equal(500);
			expect(response.body).to.equal("This range name is already taken.");
			// Check that the duplicate range has not been created
			response = await request(server)
				.get("/api/ranges/all")
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(response.status).to.equal(200);
			expect(response.body.length).to.equal(1);
		});
	});

	describe("Test deleting a detection range", () => {
		it("Test correctly deleting an existing detection range", async () => {
			// Creating 2 differents ranges
			let response = await request(server)
				.post("/api/ranges/one")
				.set({ Authorization: `Bearer ${token}` })
				.send({
					name: "testDetectionRange1",
					fromTime: "10:00",
					toTime: "13:00",
					daysSelected: 127,
				});
			expect(response.body).to.equal("ok");
			expect(response.status).to.equal(200);
			response = await request(server)
				.post("/api/ranges/one")
				.set({ Authorization: `Bearer ${token}` })
				.send({
					name: "testDetectionRange2",
					fromTime: "18:00",
					toTime: "20:00",
					daysSelected: 127,
				});
			expect(response.body).to.equal("ok");
			expect(response.status).to.equal(200);
			// Retreiving all created ranges to get range id of one of them
			response = await request(server)
				.get("/api/ranges/all")
				.set({ Authorization: `Bearer ${token}` })
				.send({});
			let targetId = response.body[1].id;
			// Using the id to delete a range
			response = await request(server)
				.delete("/api/ranges/one")
				.set({ Authorization: `Bearer ${token}` })
				.send({
					rangeId: targetId,
				});
			expect(response.status).to.equal(200);
			expect(response.body).to.equal("Range " + targetId + " deleted.");
			// Checking that a range was deleted
			response = await request(server)
				.get("/api/ranges/all")
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(response.body.length).to.equal(1);
		});

		it("Test deleting a range without providing a range id", async () => {
			// Creating 2 differents ranges
			let response = await request(server)
				.post("/api/ranges/one")
				.set({ Authorization: `Bearer ${token}` })
				.send({
					name: "testDetectionRange1",
					fromTime: "10:00",
					toTime: "13:00",
					daysSelected: 127,
				});
			expect(response.body).to.equal("ok");
			expect(response.status).to.equal(200);
			response = await request(server)
				.post("/api/ranges/one")
				.set({ Authorization: `Bearer ${token}` })
				.send({
					name: "testDetectionRange2",
					fromTime: "18:00",
					toTime: "20:00",
					daysSelected: 127,
				});
			expect(response.body).to.equal("ok");
			expect(response.status).to.equal(200);
			// Using no id to delete a range
			response = await request(server)
				.delete("/api/ranges/one")
				.set({ Authorization: `Bearer ${token}` })
				.send({});
			expect(response.status).to.equal(401);
			expect(response.body).to.equal("Missing rangeId");
			// Checking that no range was deleted
			response = await request(server)
				.get("/api/ranges/all")
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(response.body.length).to.equal(2);
		});

		it("Test deleting a range by providing a wrong range id", async () => {
			// Creating 2 differents ranges
			let response = await request(server)
				.post("/api/ranges/one")
				.set({ Authorization: `Bearer ${token}` })
				.send({
					name: "testDetectionRange1",
					fromTime: "10:00",
					toTime: "13:00",
					daysSelected: 127,
				});
			expect(response.body).to.equal("ok");
			expect(response.status).to.equal(200);
			response = await request(server)
				.post("/api/ranges/one")
				.set({ Authorization: `Bearer ${token}` })
				.send({
					name: "testDetectionRange2",
					fromTime: "18:00",
					toTime: "20:00",
					daysSelected: 127,
				});
			expect(response.body).to.equal("ok");
			expect(response.status).to.equal(200);
			// Using wrong id to delete a range
			response = await request(server)
				.delete("/api/ranges/one")
				.set({ Authorization: `Bearer ${token}` })
				.send({
					rangeId: "test123",
				});
			expect(response.status).to.equal(500);
			expect(response.body).to.equal(
				"The given id is not corresponding to any range!"
			);
			// Checking that no range was deleted
			response = await request(server)
				.get("/api/ranges/all")
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(response.body.length).to.equal(2);
		});
	});
});
