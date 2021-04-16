const express = require("express");
const app = express();
require('dotenv').config();

////////////////// Cors //////////////////////////////
const cors = require('cors')
let corsOptions = {
    origin: '*',
    credentials: 'true'
}
app.use(cors(corsOptions));
//////////////////////////////////////////////////////

////////////////// Passport //////////////////////////
// const session = require('express-session');
//
// const expireDate = new Date(Date.now() + 3600000);
//
// app.use(session({
//     resave: true,
//     saveUninitialized: true,
//     secret: process.env.SESSION_SECRET,
//     cookie: { expires: expireDate },
//     httpOnly: true,  // dont let browser javascript access cookie ever
//     secure: true, // only use cookie over https
//     ephemeral: true // delete this cookie while browser close
// }));

const passport = require("./config/passport")

app.use(passport.initialize({session: false}));
app.use(passport.session({session: false}));

module.exports = passport;
//////////////////////////////////////////////////////

///////////////// Body-parser ////////////////////////
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(bodyParser.json({limit: '50mb', extended: true}));
//////////////////////////////////////////////////////

///////////////// SYNC DB ////////////////////////////
const seq = require("./config/config");
seq.sequelize.sync()
    .then(() => {
        console.log("--\nDatabase synchronized\n--")
    })
    .catch((error) => console.log("An error occurred while Synchronization.\n", error));
//////////////////////////////////////////////////////

///////////////// Route modules //////////////////////
const routeUser = require("./routes/routeUser");
const routeTag = require("./routes/routeTag");
const routeData = require("./routes/routeData");

app.use("/tags", routeTag);
app.use("/users", routeUser);
app.use("/data", routeData);
//////////////////////////////////////////////////////

////////////////// Port connection ///////////////////
const PORT = process.env.PORT || '3001';
//////////////////////////////////////////////////////

app.listen(PORT);
