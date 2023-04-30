const chai = require("chai");
const request = require("supertest");
const server = require("../app.js");

const { expect } = chai;

// let token;
// let { body, status } = await request(server).post("/api/users/signin").send({
// 	email: "test@test.com",
// 	password: "test1234",
// });
// token = body.token;

// describe("Test post tag 'one' route ", async () => {
// 	test("Test adding a correct tag", async () => {
// 		console.log("HELLO");
// 		let { body, status } = await request(server)
// 			.get("/api/tags/all")
// 			.send()
// 			.query(token);
// 		console.log(body, status);
// 	});
// });
