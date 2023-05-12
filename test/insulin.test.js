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

	describe("Testing file import", () => {
		it("", async () => {});
	});
});
