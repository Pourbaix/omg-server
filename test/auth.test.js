const chai = require("chai");
const request = require("supertest");
const server = require("../app.js");

const { expect } = chai;

describe("Testing user routes", () => {
	describe("Test connection with 'signin' POST route", async () => {
		it("Test connection to server fails with bad password and mail", async () => {
			// Connection with a non-existing user
			const response = await request(server)
				.post("/api/users/signin")
				.send({
					email: "notexist@notexist.com",
					password: "notexist",
				});
			expect(response.status).to.equal(200);
			expect(response.body.status).to.equal("error");
			expect(response.body.token).to.be.undefined;
		});
		it("Test connection to server fails with good mail but bad password", async () => {
			// Connection with an existing user with bad password
			const response = await request(server)
				.post("/api/users/signin")
				.send({
					email: "test@test.com",
					password: "notexist",
				});
			expect(response.status).to.equal(200);
			expect(response.body.status).to.equal("error");
			expect(response.body.token).to.be.undefined;
		});
		it("Test connection to server fails with bad mail but good password", async () => {
			// Connection with a non-existing user
			const response = await request(server)
				.post("/api/users/signin")
				.send({
					email: "notexist@notexist.com",
					password: "test1234",
				});
			expect(response.status).to.equal(200);
			expect(response.body.status).to.equal("error");
			expect(response.body.token).to.be.undefined;
		});
		it("Test connection to server succes with good credentials", async () => {
			// Connection with an existing user
			let response = await request(server)
				.post("/api/users/signin")
				.send({
					email: "test@test.com",
					password: "test1234",
				});
			expect(response.status).to.equal(200);
			expect(response.body.status).to.equal("ok");
			expect(response.body.message).to.equal("connected");
			expect(response.body.token).to.not.be.undefined;
			let token = response.body.token;

			response = await request(server)
				.get("/api/users/verify")
				.set({ Authorization: `Bearer ${token}` })
				.send();
			expect(response.status).to.equal(200);
			expect(response.body.status).to.equal("ok");
			expect(response.body.message).to.equal("valid key");
		});
	});

	describe("Adding new user with 'signup' route", () => {
		it("Test that adding a new user and connecting to it works", async () => {
			// Adding a new user with good credentials
			let response = await request(server)
				.post("/api/users/signup")
				.send({
					firstName: "newuser",
					lastName: "newuser",
					email: "newuser@newuser.com",
					password: "newuser1234",
				});
			expect(response.status).to.equal(200);
			expect(response.body.status).to.equal("ok");
			expect(response.body.message).to.equal("Account created !");
			// Connection with the created user
			response = await request(server).post("/api/users/signin").send({
				email: "newuser@newuser.com",
				password: "newuser1234",
			});
			expect(response.status).to.equal(200);
			expect(response.body.status).to.equal("ok");
			expect(response.body.message).to.equal("connected");
			expect(response.body.token).to.not.be.undefined;
		});
		it("Test that adding 2 times the same user does not pass", async () => {
			// Adding a new user that already exist
			let response = await request(server)
				.post("/api/users/signup")
				.send({
					firstName: "testUser",
					lastName: "testUser",
					email: "test@test.com",
					password: "test1234",
				});
			expect(response.status).to.equal(400);
			expect(response.body.status).to.equal("error");
			expect(response.body.message).to.equal(
				"That email is already taken"
			);
		});
		it("Test that adding a user with already used address does not pass", async () => {
			// Adding a new user with a mail that already exists
			let response = await request(server)
				.post("/api/users/signup")
				.send({
					firstName: "notexisting",
					lastName: "notexisting",
					email: "newuser@newuser.com",
					password: "notexisting1234",
				});
			expect(response.status).to.equal(400);
			expect(response.body.status).to.equal("error");
			expect(response.body.message).to.equal(
				"That email is already taken"
			);
		});
		it("Test that adding a user with wrong mail address does not pass", async () => {
			// Bad mail
			let response = await request(server)
				.post("/api/users/signup")
				.send({
					firstName: "notexisting",
					lastName: "notexisting",
					email: "notexisting.notexisting.com",
					password: "notexisting1234",
				});
			expect(response.status).to.equal(400);
			expect(response.body.status).to.equal("error");
			expect(response.body.message).to.equal(
				"Email address not formed correctly."
			);
		});
		it("Test that adding a user with wrong password does not pass", async () => {
			// Bad password
			const { body, status } = await request(server)
				.post("/api/users/signup")
				.send({
					firstName: "notexisting",
					lastName: "notexisting",
					email: "notexisting@notexisting.com",
					password: "1234",
				});
			expect(status).to.equal(400);
			expect(body.status).to.equal("error");
			expect(body.message).to.equal(
				"Password must be 8 or more characters."
			);
		});
	});
});
