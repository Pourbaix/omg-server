const User = require("../models/modelUser");
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const passport = require("../app");

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
exports.postSignup = async function(req, res){
    if (!isValidPassword(req.body.password)) {
        return res.status(400).json({status: 'error', message: 'Password must be 8 or more characters.'});
    }
    if (!isValidEmail(req.body.email)) {
        return res.status(400).json({status: 'error', message: 'Email address not formed correctly.'});
    }

    let salt = crypto.randomBytes(64).toString('hex');
    let password = crypto.pbkdf2Sync(req.body.password, salt, 10000, 64, 'sha512').toString('base64');

    let user = await User.findOne(
        { where: {
                email: req.body.email
            }
        });
    if (user){
        return res.status(400).json({status: 'error', message: 'That email is already taken' });
    }

    try {
        let user = await User.create({
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            password: password,
            salt: salt
        });
        res.status(200).json({status: 'ok', message: 'Account created !'})
    } catch (err) {
        return res.status(400).json({status: 'error', message: 'Email address already exists.'});
    }
}

/**
 * post signin route controller. manages the connection of a user
 *
 * @param req
 * @param res
 * @return {Promise<void>}
 */
exports.postSignin = async function(req, res){
    try {
        passport.authenticate('local-signin', {session: false}, function(err, user) {
            if (err) { return res.json({status: 'error', message: err}); }
            if (!user) {
                return res.json({status: 'error', message: "Incorrect email and/or password"});
            }
            req.logIn(user, {session: false}, function(err) {
                if (err) {
                    return res.json({status: 'error', message: err});
                }
                const token = jwt.sign(user.dataValues, 'jwt1234', {expiresIn: "2h"});
                return res.json({status: 'ok', message: "connected", token: token});
            });
        })(req, res);
    } catch (e){
        res.status(500).json(e);
    }
}

/**
 * verify route controller. Check if the given token is valid.
 *
 * @param req
 * @param res
 * @return {Promise<void>}
 */
exports.testKey = async function (req, res) {
    try {
        passport.authenticate('local-jwt', {session: false}, function (err, user) {
            if (err) {
                return res.status(500).json("Authentication error");
            }
            else if (!user) {
                return res.status(401).json("Incorrect token");
            }
            else {
                return res.status(200).json("ok");
            }
        })(req, res);
    } catch (e) {
        res.status(500).json(e);
    }
}

//////////////////////////////////////////////////////
/////////// controllers functions helpers ////////////
//////////////////////////////////////////////////////

function isValidPassword(password) {
    return password.length >= 8;

}

//uses a regex to check if email is valid
function isValidEmail(email) {
    let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}
