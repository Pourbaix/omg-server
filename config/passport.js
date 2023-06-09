//////////////////////////////////////////////////////
///////////// Passport config file ///////////////////
//////////////////////////////////////////////////////
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const User = require("../models/modelUser");
const crypto = require("crypto");
const passportJWT = require("passport-jwt");
const JWTStrategy = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;

passport.serializeUser(function (user, done) {
	done(null, user);
});

passport.deserializeUser(function (user, done) {
	done(null, user);
});

/**
 * local signin passport strategy. Check if the email and password match a user in the database.
 *
 * @return false if no match or a user context if match
 */
passport.use(
	"local-signin",
	new LocalStrategy(
		{
			usernameField: "email",
			passwordField: "password",
		},
		async function (email, password, done) {
			let user = await User.findOne({
				where: {
					email: email,
				},
			});
			if (!user) {
				return done(null, false);
			}
			let cryptedPassword = crypto
				.pbkdf2Sync(password, user.salt, 10000, 64, "sha512")
				.toString("base64");
			if (user.password !== cryptedPassword) {
				return done("bad password", false);
			}
			return done(null, user);
		}
	)
);

/**
 * local-jwt Passport strategy. Check given token.
 *
 * @return user context if the given token is valid or error if not valid.
 */
passport.use(
	"local-jwt",
	new JWTStrategy(
		{
			jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
			secretOrKey: "jwt1234",
		},
		function (jwtPayload, done) {
			try {
				return done(null, jwtPayload);
			} catch (error) {
				return done(error);
			}
		}
	)
);

module.exports = passport;
