const Data = require("../models/modelData");
const seq = require("../config/config");
const ctrTag = require("../controllers/ctrTag");
const Sequelize = seq.Sequelize, sequelize = seq.sequelize;
const csv = require('fast-csv');
const fs = require('fs');
const passport = require("../app");

//////////////////////////////////////////////////////
/////////////// Routes controllers ///////////////////
//////////////////////////////////////////////////////

exports.getOne = function (req, res) {
    Data.findAll({
        where: {
            id: req.params.id
        }
    })
        .then(results => res.json(results[0]))
        .catch(error => res.status(500).json(error));
};

exports.chart = async function (req, res) {
    try {
        passport.authenticate('local-jwt', {session: false}, async function (err, user){
            console.log(user);
            if (err) { return res.json({status: 'Authentication error', message: err}); }
            if (!user) {
                return res.json({status: 'error', message: "Incorrect token"});
            }
            let allData = await getAllData(await ctrTag.getTagsFromName(req.query.tagName, user.id), user.id);
            let response = {
                'datasetsLabel' : Object.keys(allData),
                'chartData': chartFormatAllData(formatAllData(allData))
            };
            res.status(200).json(response);
        })(req, res);
    }catch (e) {
        res.status(500).json(e);
    }
}

exports.postFile = function (req, res) {
    try {
        passport.authenticate('local-jwt', {session: false}, function (err, user){
            if (err) { return res.json({status: 'Authentication error', message: err}); }
            if (!user) {
                return res.json({status: 'error', message: "Incorrect token"});
            }
            if (!req.file) {
                return res.status(400).json('No files were uploaded.');
            }
            if (req.file.originalname.split(".")[1] !== "csv"){
                return res.status(400).json('Only CSV files are allowed.');
            }
            getFromMiniMedPump(req, res, user);
        })(req, res);
    }catch (e) {
        res.status(500).json(e);
    }
}

//////////////////////////////////////////////////////
/////////// controllers functions helpers ////////////
//////////////////////////////////////////////////////

function getFromMiniMedPump(req, res, user) {
    const fileRows = [];
    // open uploaded file
    csv.parseFile(req.file.path, {delimiter: ';'})
        .on("data", function (data) {
            fileRows.push(data); // push each row
        })
        .on("end", function () {
            fs.unlinkSync(req.file.path);   // remove temp file
            ////////////////////process "fileRows" and respond
            // Variables
            let dataObj = {'date': [], 'time': [], 'glucose': []};
            let colDate = -1, colTime = -1, colGlucose = -1;
            // Find column numbers
            fileRows.forEach((row) => {
                if (colDate < 0) {
                    row.forEach((e) => {
                        if ((typeof e).toString() === "string") {
                            if (e === "Date")
                                colDate = row.indexOf(e);
                        }
                    });
                }
                if (colTime < 0) {
                    row.forEach((e) => {
                        if ((typeof e).toString() === "string") {
                            if (e === "Time")
                                colTime = row.indexOf(e);
                        }
                    });
                }
                if (colGlucose < 0) {
                    row.forEach((e) => {
                        if ((typeof e).toString() === "string") {
                            if (e === "Sensor Glucose (mg/dL)")
                                colGlucose = row.indexOf(e);
                        }
                    });
                }
            });
            // Retrieve date time and glucose rows
            fileRows.forEach((row) => {
                if (((typeof row[colDate]).toString() === "string") && ((typeof row[colTime]).toString() === "string") && ((typeof row[colGlucose]).toString() === "string")) {
                    if (row[colGlucose] === "ISIG Value")
                        colGlucose -= 1;
                    if (row[colGlucose] === "Sensor Calibration BG (mg/dL)")
                        colGlucose += 1;
                    if ((row[colDate].includes('/')) && (row[colTime].includes(':') && (row[colGlucose].length > 3))) {
                        dataObj.glucose.push(row[colGlucose]);
                        dataObj.date.push(row[colDate]);
                        dataObj.time.push(row[colTime]);
                    }
                }
            });
            try {
                for (let i = 0; i < dataObj.date.length; i++) {
                    let dbFormatDatetime = parseDatetime(dataObj.date[i], dataObj.time[i])
                    Data.create({
                        datetime: dbFormatDatetime,
                        glucose: parseInt(dataObj.glucose[i]),
                        userId: user.id
                    });
                }
                res.status(200).json('ok');
            } catch (e) {
                res.status(500).json('An error occured while insert data');
            }
        });
}

function parseDatetime(date, time) {
    return date.substring(0, 4) + "-" + date.substring(5, 7) + "-" + date.substring(8, 10) + "T" + time + "Z"
}

async function getAllData(tags, userId) {
    let datetimeTag = {};
    for (let i = 0; i < Object.keys(tags).length; i++) {
        let datetime = tags[i].getDataValue('startDatetime').toISOString();
        let fromHours = parseInt(datetime.substring(11, 13)) - 1;
        fromHours = fromHours < 10 ? "0" + fromHours : fromHours;
        let toHours = parseInt(datetime.substring(11, 13)) + 3;
        toHours = toHours < 10 ? "0" + toHours : toHours;
        let fromDate = datetime.substring(0, 11) + fromHours + datetime.substring(13, datetime.length);
        let toDate = datetime.substring(0, 11) + toHours + datetime.substring(13, datetime.length);
        datetimeTag[datetime] = await findFromDateToDate(fromDate, toDate, userId);
    }
    return datetimeTag;
}

async function findFromDateToDate (fromDate, toDate, userId) {
    try {
        const results = await Data.findAll({
            attributes: ['datetime', 'glucose'],
            where: {
                userId: userId,
                datetime: {
                    [Sequelize.Op.between]: [fromDate, toDate]
                }
            },
            order: [
                ['datetime']
            ]

        });
        return results;
    }catch (error) {
        return "findFromDateToDate request error";
    }
}

function formatAllData(realDatetimesTags) {
    let relativeTimesTags = JSON.parse(JSON.stringify(realDatetimesTags));
    Object.keys(relativeTimesTags).forEach((e) => {
        let eventDate = new Date(e);
        relativeTimesTags[e].forEach((measure) => {
            let realDate = new Date(measure.datetime);
            let hours = dateDiff(eventDate, realDate);
            measure.relative = hours[0] + hours[1] + ':' + hours[2] + ':' + hours[3];
        })
    });
    return relativeTimesTags;
}

function chartFormatAllData(allData) {
    let chartData = [];
     for (let i = 0; i < Object.keys(allData).length; i++ ) {
        allData[Object.keys(allData)[i]].forEach((measure) => {
            let e = measure.relative
            let value = (e[0] + e.substring(1, e.length).split(':')[0] + e.substring(1, e.length).split(':')[1] + e.substring(1, e.length).split(':')[2]);
            let dataTab = [];
            for (let j = 0; j < Object.keys(allData).length; j++){
                if (i === j){
                    dataTab[j] = measure.glucose;
                }
                else
                    dataTab[j] = null;
            }
            chartData.push([value, dataTab]);
        });
    }
    chartData.sort(function(a, b) {
        return a[0] - b[0];
    })
    for (let i = 0; i < chartData.length; i++) {
        chartData[i][0] = chartData[i][0].substring(0, 3) + ':' + chartData[i][0].substring(3, 5) + ':' + chartData[i][0].substring(5, 7);
    }
    return chartData;
}

function dateDiff(eventDate, realDate) {
    let d = Math.abs(eventDate - realDate) / 1000;                           // delta
    let r = {};                                                                // result
    let s = {
        hour: 3600,
        minute: 60,
        second: 1
    };
    let tab = []
    if (realDate < eventDate) {
        tab.push('-');
    } else {
        tab.push('+');
    }
    Object.keys(s).forEach(function (key) {
        r[key] = Math.floor(d / s[key]);
        d -= r[key] * s[key];
        if (r[key] < 10) {
            r[key] = "0" + r[key];
        }
        tab.push(r[key]);
    });
    return tab;
}
