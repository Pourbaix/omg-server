const express = require("express");
const app = express();
require('dotenv').config();
const path = require('path');

///////////////// Body-parser ////////////////////////
const exphbs = require('express-handlebars');
app.engine('hbs', exphbs({
    defaultLayout: 'main',
    extname: '.hbs'
}));
// Setting template Engine
app.set('view engine', 'hbs');
//////////////////////////////////////////////////////

///////////////// Body-parser ////////////////////////
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
//////////////////////////////////////////////////////

///////////////// SYNC DB ////////////////////////////
const seq = require("./config/config");
seq.sequelize.sync()
    .then(() => {
        console.log("--\nDatabase synchronized\n--")
    })
    .catch((error) => console.log("An error occurred while Synchronization.\n", error));
//////////////////////////////////////////////////////

///////////////// Routes /////////////////////////////
const routeUser = require("./routes/routeUser");
const routeTag = require("./routes/routeTag");
const routeData = require("./routes/routeData")

app.use("/tags", routeTag);
app.use("/users", routeUser);
app.use("/datas", routeData);
//////////////////////////////////////////////////////

///////////////// ?????? /////////////////////////////
/* Page HTML avec formulaire pour tester la requête POST pour l'ajout d'un pot */
const PORT = process.env.PORT || '3000';
//////////////////////////////////////////////////////

app.listen(PORT);
