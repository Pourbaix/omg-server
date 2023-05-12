const chai = require("chai");
const request = require("supertest");
const server = require("../app.js");

const { expect } = chai;

describe("Testing tags routes", () => {
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

	describe("Test get tag and post 'one' routes", () => {
		it("Test getting all tags with nothing in db", async () => {
			let { body, status } = await request(server)
				.get("/api/tags/all")
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(body.length).to.equal(0);
			expect(status).to.equal(200);
		});
		it("Test adding tag in the db", async () => {
			let { body, status } = await request(server)
				.post("/api/tags/one")
				.set({ Authorization: `Bearer ${token}` })
				.send({
					tag: "TestTag",
					startDatetime: new Date("2023-02-04T13:22:30.667Z"),
					endDatetime: new Date("2023-02-04T13:22:30.667Z"),
				});
			expect(status).to.equal(200);
		});
		it("Test getting all tags with a tag in db", async () => {
			let { body, status } = await request(server)
				.get("/api/tags/all")
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(body.length).to.equal(1);
			expect(status).to.equal(200);
		});
	});

	describe("Testing post pending tag route", () => {
		it("Testing get all pending tags with no pending tags in db", async () => {
			let { body, status } = await request(server)
				.get("/api/tags/pending")
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(body.length).to.equal(0);
			expect(status).to.equal(200);
		});

		it("Testing the post of pending tags", async () => {
			let { body, status } = await request(server)
				.post("/api/tags/pending")
				.set({ Authorization: `Bearer ${token}` })
				.send({
					pendingTags: [
						{
							pendingName: "TestPendingTag1",
							pendingDatetime: "2023-02-04T10:00:00.000Z",
						},
						{
							pendingName: "TestPendingTag2",
							pendingDatetime: "2023-02-04T11:00:00.000Z",
						},
					],
				});
			expect(status).to.equal(200);
			expect(body).to.equal("redirect");
		});

		it("Testing get all pending tags with 2 pending tags in db", async () => {
			let { body, status } = await request(server)
				.get("/api/tags/pending")
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(body.length).to.equal(2);
			expect(status).to.equal(200);
		});

		it("Testing adding an already existing tag give a 'alreadyexist' message", async () => {
			let { body, status } = await request(server)
				.post("/api/tags/pending")
				.set({ Authorization: `Bearer ${token}` })
				.send({
					pendingTags: [
						{
							pendingName: "TestPendingTag1",
							pendingDatetime: "2023-02-04T10:00:00.000Z",
						},
					],
				});
			expect(status).to.equal(200);
			expect(body).to.equal("alreadyexists");
		});
	});

	describe("Testing get tags with no data", () => {
		it("Making sure we have no glucose data in the DB", async () => {
			let { body, status } = await request(server)
				.delete("/api/data/all")
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(body).to.equal("All data deleted.");
			expect(status).to.equal(200);
		});

		it("Testing that getting tags with no data returns all the previously created tags", async () => {
			let { body, status } = await request(server)
				.get("/api/tags/withNoData")
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(status).to.equal(200);
			expect(body.length).to.equal(1);
			expect(body[0].name).to.equal("TestTag");
		});

		it("Adding one data to the corresponding 'missing data' tag", async () => {
			let { body, status } = await request(server)
				.post("/api/data/manyData")
				.set({ Authorization: `Bearer ${token}` })
				.send({
					glucose_data: [
						{
							datetime: "2023-02-04T13:22:30.667Z",
							glucose: 117,
							pumpSN: "708NS",
						},
					],
				});
			expect(body).to.equal("Data created");
			expect(status).to.equal(200);
		});

		it("Testing that getting tags with no data returns nothing", async () => {
			// Should not return something since the tag has now a corresponding value
			let { body, status } = await request(server)
				.get("/api/tags/withNoData")
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(status).to.equal(200);
			expect(body.length).to.equal(0);
		});
	});
});
