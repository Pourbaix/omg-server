const chai = require("chai");
const request = require("supertest");
const server = require("../app.js");

const { expect } = chai;

describe("Test connection with 'signin' POST route", async () => {
	it("Test connection to server fails with bad password and mail", async () => {
		// Connection with a non-existing user
		const { body, status } = await request(server)
			.post("/api/users/signin")
			.send({
				email: "notexist@notexist.com",
				password: "notexist",
			});
		expect(status).to.equal(200);
		expect(body.status).to.equal("error");
		expect(body.token).to.be.undefined;
	});
	it("Test connection to server fails with good mail but bad password", async () => {
		// Connection with an existing user with bad password
		const { body, status } = await request(server)
			.post("/api/users/signin")
			.send({
				email: "test@test.com",
				password: "notexist",
			});
		expect(status).to.equal(200);
		expect(body.status).to.equal("error");
		expect(body.token).to.be.undefined;
	});
	it("Test connection to server fails with bad mail but good password", async () => {
		// Connection with a non-existing user
		const { body, status } = await request(server)
			.post("/api/users/signin")
			.send({
				email: "notexist@notexist.com",
				password: "test1234",
			});
		expect(status).to.equal(200);
		expect(body.status).to.equal("error");
		expect(body.token).to.be.undefined;
	});
	it("Test connection to server succes with good credentials", async () => {
		// Connection with an existing user
		const { body, status } = await request(server)
			.post("/api/users/signin")
			.send({
				email: "test@test.com",
				password: "test1234",
			});
		expect(status).to.equal(200);
		expect(body.status).to.equal("ok");
		expect(body.message).to.equal("connected");
		expect(body.token).to.not.be.undefined;
	});
});

describe("Adding new user with 'signup' route", () => {
	it("Test that adding a new user works", async () => {
		// Adding a new user with good credentials
		const { body, status } = await request(server)
			.post("/api/users/signup")
			.send({
				firstName: "newuser",
				lastName: "newuser",
				email: "newuser@newuser.com",
				password: "newuser1234",
			});
		expect(status).to.equal(200);
		expect(body.status).to.equal("ok");
		expect(body.message).to.equal("Account created !");
	});
	it("Test connection to server success after creating account", async () => {
		// Connection with an existing user
		const { body, status } = await request(server)
			.post("/api/users/signin")
			.send({
				email: "newuser@newuser.com",
				password: "newuser1234",
			});
		expect(status).to.equal(200);
		expect(body.status).to.equal("ok");
		expect(body.message).to.equal("connected");
		expect(body.token).to.not.be.undefined;
	});
	it("Test that adding 2 times the same user does not pass", async () => {
		// Adding a new user that already exist
		const { body, status } = await request(server)
			.post("/api/users/signup")
			.send({
				firstName: "newuser",
				lastName: "newuser",
				email: "newuser@newuser.com",
				password: "newuser1234",
			});
		expect(status).to.equal(400);
		expect(body.status).to.equal("error");
		expect(body.message).to.equal("That email is already taken");
	});
	it("Test that adding auser with already used adress does not pass", async () => {
		// Adding a new user with a mail that already exists
		const { body, status } = await request(server)
			.post("/api/users/signup")
			.send({
				firstName: "notexisting",
				lastName: "notexisting",
				email: "newuser@newuser.com",
				password: "notexisting1234",
			});
		expect(status).to.equal(400);
		expect(body.status).to.equal("error");
		expect(body.message).to.equal("That email is already taken");
	});
	it("Test that adding a user with wrong mail address does not pass", async () => {
		// Bad mail
		const { body, status } = await request(server)
			.post("/api/users/signup")
			.send({
				firstName: "notexisting",
				lastName: "notexisting",
				email: "notexisting.notexisting.com",
				password: "notexisting1234",
			});
		expect(status).to.equal(400);
		expect(body.status).to.equal("error");
		expect(body.message).to.equal("Email address not formed correctly.");
	});
	it("Test that adding a user with wrong password does not pass", async () => {
		// Bad mail
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
		expect(body.message).to.equal("Password must be 8 or more characters.");
	});
});

// describe("Test the 'verify' route to test token", () => {
// 	it("Test that the verification passes with a valid token", async () => {
// 		// Connecting correctly to an account
// 		let { body, status } = await request(server)
// 			.post("/api/users/signin")
// 			.send({
// 				email: "test@test.com",
// 				password: "test1234",
// 			});
// 		let { requestBody, requestStatus } = await request(server).get(
// 			"/api/users/verify"
// 		);
// 		expect(requestStatus).to.equal(200);
// 		expect(requestBody.status).to.equal("ok");
// 		expect(requestBody.message).to.equal("valid key");
// 	});
// });
