const { RateLimiterMemory } = require("rate-limiter-flexible");

// A middleware is just a piece of code that will be executed before each requests

// Config for the rate limiter:
// Max points: 10
// Time before points reset: 1sec
// In short, user can send max 30 request/sec
// If he sends more => Blocked for 5 secs
// This is used to prevent DDOS on the API
const rateLimiter = new RateLimiterMemory({
	points: 30,
	duration: 1,
	blockDuration: 5,
});

const rateLimiterMiddleware = async (req, res, next) => {
	rateLimiter
		.consume(req.ip, 1) // Consume 1 points per requests, in this case max 30 requests/sec
		.then((rateLimiterRes) => {
			// Allowed, if some points are left (>=1)
			// When allowed, we just proceed to the normal behaviour
			next();
		})
		.catch((rej) => {
			// Blocked, if there is not enough points (<1)
			// When blocked, we send a 429 response ("Too many Requests")
			console.log("Blocked:", rej);
			res.status(429).send("Too Many Requests");
		});
};

module.exports = rateLimiterMiddleware;
