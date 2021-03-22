const express = require("express");
const app = express();
require('dotenv').config();
const path = require('path');
app.use(express.static(path.join(__dirname, 'static')));
process.env.TZ = 'Europe/Brussels';
const Tag = require('./models/modelTag');
const Data = require('./models/modelData');
///////////////// Body-parser ////////////////////////
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
//////////////////////////////////////////////////////

///////////////// express-handlebars /////////////////
const exphbs = require('express-handlebars');
app.engine('hbs', exphbs({
    defaultLayout: 'main',
    extname: '.hbs'
}));
// Setting template Engine
app.set('view engine', 'hbs');
//////////////////////////////////////////////////////

///////////////// SYNC DB ////////////////////////////
const seq = require("./config/config");
seq.sequelize.models.data.belongsToMany(seq.sequelize.models.tag, {through: 'dataTags'});
seq.sequelize.models.tag.belongsToMany(seq.sequelize.models.data, {through: 'dataTags'});
seq.sequelize.sync( )
    .then(() => {
        console.log("--\nDatabase synchronized\n--")
    })
    .catch((error) => console.log("An error occurred while Synchronization.\n", error));
//////////////////////////////////////////////////////

///////////////// Route modules /////////////////////////////
const routeUser = require("./routes/routeUser");
const routeTag = require("./routes/routeTag");
const routeData = require("./routes/routeData");
const routeTemplates = require("./routes/routeTemplates");

app.use("/tags", routeTag);
app.use("/users", routeUser);
app.use("/data", routeData);
app.use("/", routeTemplates);
//////////////////////////////////////////////////////

///////////////// Port connection /////////////////////////////
const PORT = process.env.PORT || '3000';
//////////////////////////////////////////////////////

app.listen(PORT);
