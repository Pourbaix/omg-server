const User = require("../models/modelUser");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const passport = require("../app");

///////////////////////////////////////////////////////////
/////////////// Rate Limiter Definition ///////////////////
///////////////////////////////////////////////////////////
const { RateLimiterMemory } = require("rate-limiter-flexible");

const maxWrongAttemptsByIPperDay = 100;
const maxConsecutiveFailsByUsernameAndIP = 10;

// Allows us to limit the number of failed connections for 1 day and for 1 ip address
const limiterSlowBruteByIP = new RateLimiterMemory({
	keyPrefix: "SlowBruteByIp",
	points: maxWrongAttemptsByIPperDay,
	duration: 60 * 60 * 24,
	blockDuration: 60 * 60 * 24, // Block for 1 day, if 100 wrong attempts per day
});

// Allows us to limit the number of failed connections for 1 day, for one ip address and for 1 account
const limiterConsecutiveFailsByUsernameAndIP = new RateLimiterMemory({
	keyPrefix: "ConsecutiveFailsByUsernameAndIP",
	points: maxConsecutiveFailsByUsernameAndIP,
	duration: 60 * 60 * 24, // Store number for 24 h since first fail
	blockDuration: 60 * 60, // Block for 1 hour
});

const getUsernameIPkey = (username, ip) => `${username}_${ip}`;

//////////////////////////////////////////////////////
/////////////// Routes controllers ///////////////////
//////////////////////////////////////////////////////

/**
 * post signup route controller. manages the creation of an account.
 *
 * @param req
 * @param res
 * @return {Promise<*>} : Response
 */
exports.postSignup = async function (req, res) {
	if (!isValidPassword(req.body.password)) {
		return res.status(400).json({
			status: "error",
			message: "Password must be 8 or more characters.",
		});
	}
	if (!isValidEmail(req.body.email)) {
		return res.status(400).json({
			status: "error",
			message: "Email address not formed correctly.",
		});
	}

	let salt = crypto.randomBytes(64).toString("hex");
	let password = crypto
		.pbkdf2Sync(req.body.password, salt, 10000, 64, "sha512")
		.toString("base64");

	let user = await User.findOne({
		where: {
			email: req.body.email,
		},
	});
	if (user) {
		return res
			.status(400)
			.json({ status: "error", message: "That email is already taken" });
	}

	try {
		let user = await User.create({
			firstName: req.body.firstName,
			lastName: req.body.lastName,
			email: req.body.email,
			password: password,
			salt: salt,
		});
		res.status(200).json({ status: "ok", message: "Account created !" });
	} catch (err) {
		return res.status(400).json({
			status: "error",
			message: "Email address already exists.",
		});
	}
};

/**
 * post signin route controller. manages the connection of a user
 *
 * @param req
 * @param res
 * @return {Promise<void>}
 */
exports.postSignin = async function (req, res) {
	try {
		passport.authenticate(
			"local-signin",
			{ session: false },
			async function (err, user) {
				// Retrieving ip address and email of the account to create the auth identifier which will be used for the "limiterConsecutiveFailsByUsernameAndIP" limiter
				const ipAddr = req.ip;
				const usernameIPkey = getUsernameIPkey(req.body.email, ipAddr);

				// Recover the different states of ips
				// It returns null if no ips were detected has failed auth (in general when server started)
				const [resUsernameAndIP, resSlowByIP] = await Promise.all([
					limiterConsecutiveFailsByUsernameAndIP.get(usernameIPkey),
					limiterSlowBruteByIP.get(ipAddr),
				]);
				// console.log(resUsernameAndIP, resSlowByIP);

				// Number of seconds before the client can retry the auth
				let retrySecs = 0;

				// Set the number of seconds before the user can try to auth again
				if (
					resSlowByIP !== null &&
					resSlowByIP.consumedPoints > maxWrongAttemptsByIPperDay
				) {
					retrySecs =
						Math.round(resSlowByIP.msBeforeNext / 1000) || 1;
				} else if (
					resUsernameAndIP !== null &&
					resUsernameAndIP.consumedPoints >
						maxConsecutiveFailsByUsernameAndIP
				) {
					retrySecs =
						Math.round(resUsernameAndIP.msBeforeNext / 1000) || 1;
				}

				// If user is blocked
				if (retrySecs > 0) {
					res.set("Retry-After", String(retrySecs));
					return res.status(429).json({
						status: "error",
						message:
							"Too many failure, try again in " +
							retrySecs +
							" seconds",
					});
					// if user is not yet blocked, he can try to auth
				} else {
					if (!user) {
						try {
							// if auth fails, we remove one from the counter
							const promises = [
								limiterSlowBruteByIP.consume(ipAddr),
							];
							if (err == "bad password") {
								// Count failed attempts by Username + IP only for registered users
								promises.push(
									limiterConsecutiveFailsByUsernameAndIP.consume(
										usernameIPkey
									)
								);
							}

							await Promise.all(promises);
							return res.json({
								status: "error",
								message: "Incorrect email and/or password",
							});
						} catch (rlRejected) {
							if (rlRejected instanceof Error) {
								throw rlRejected;
							} else {
								res.set(
									"Retry-After",
									String(
										Math.round(
											rlRejected.msBeforeNext / 1000
										)
									) || 1
								);
								return res.status(429).json({
									status: "error",
									message:
										"Too many failure, try again in " +
										retrySecs +
										" seconds",
								});
							}
						}
					}
					// If auth is successful
					req.logIn(user, { session: false }, async function (err) {
						if (err) {
							return res.json({ status: "error", message: err });
						} else {
							if (
								resUsernameAndIP !== null &&
								resUsernameAndIP.consumedPoints > 0
							) {
								// Reset limiter on successful authentification
								await limiterConsecutiveFailsByUsernameAndIP.delete(
									usernameIPkey
								);
							}
							const token = jwt.sign(user.dataValues, "jwt1234", {
								expiresIn: "2h",
							});
							return res.json({
								status: "ok",
								message: "connected",
								token: token,
							});
						}
					});
				}
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};

/**
 * verify route controller. Check if the given token is valid.
 *
 * @param req
 * @param res
 * @return {Promise<void>}
 */
exports.testKey = async function (req, res) {
	try {
		passport.authenticate(
			"local-jwt",
			{ session: false },
			function (err, user) {
				if (err) {
					return res.status(500).json({
						status: "error",
						message: "Authentication error",
					});
				} else if (!user) {
					return res
						.status(401)
						.json({ status: "error", message: "Incorrect token" });
				} else {
					return res
						.status(200)
						.json({ status: "ok", message: "valid key" });
				}
			}
		)(req, res);
	} catch (e) {
		res.status(500).json(e);
	}
};

//////////////////////////////////////////////////////
/////////// controllers functions helpers ////////////
//////////////////////////////////////////////////////

function isValidPassword(password) {
	return password.length >= 8;
}

//uses a regex to check if email is valid
function isValidEmail(email) {
	let re =
		/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	return re.test(String(email).toLowerCase());
}
