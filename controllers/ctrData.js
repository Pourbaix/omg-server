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
/**
 *  Chart route controller. retrieves and formats data for the ChartBasic chart
 *
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
exports.chart = async function (req, res) {
    try {
        passport.authenticate('local-jwt', {session: false}, async function (err, user) {
            if (err) {
                return res.json({status: 'Authentication error', message: err});
            }
            if (!user) {
                return res.json({status: 'error', message: "Incorrect token"});
            }
            if (!"tagName" in req.query) {
                return res.json({status: 'error', message: "missing tagName"});
            }
            let allData = await getAllDataFromTag(await ctrTag.getTagsFromName(req.query.tagName, user.id), user.id);
            let response = {
                'datasetsLabel': Object.keys(allData),
                'chartData': chartFormatAllData(addRelativeToAllData(allData))
            };
            // let response = chartFormatAllData(addRelativeToAllData(await getAllDataFromTag(await ctrTag.getTagsFromName(req.query.tagName, user.id), user.id)));
            res.status(200).json(response);
        })(req, res);
    } catch (e) {
        res.status(500).json(e);
    }
}
/**
 * Import Data file Controller
 *
 * @param req
 * @param res
 */
exports.postFile = function (req, res) {
    try {
        // Authentification strategy
        passport.authenticate('local-jwt', {session: false}, function (err, user) {
            if (err) {
                return res.json({status: 'Authentication error', message: err});
            }
            if (!user) {
                return res.json({status: 'error', message: 'Incorrect token'});
            }
            if (!req.file) {
                return res.status(400).json('No files were uploaded.');
            }
            if (req.file.originalname.split(".")[1] !== "csv") {
                return res.status(400).json('Only CSV files are allowed.');
            }
            getFromMiniMedPump(req, res, user);
            // if (!"modelSensor" in req.query) {
            //     return res.json({status: 'error', message: "missing modelSensor"});
            // }
            // if (req.query.modelSensor === 'minimed') {
            //     getFromMiniMedPump(req, res, user);
            // }

        })(req, res);
    } catch (e) {
        res.status(500).json(e);
    }
}

//////////////////////////////////////////////////////
/////////// controllers functions helpers ////////////
//////////////////////////////////////////////////////
/**
 *  Minimed import method
 * @param req
 * @param res
 * @param user
 */
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
            let dataObj = {'date': [], 'time': [], 'glucose': [], 'pumpSN': []};
            let cols = findInFileRows(fileRows, 0);
            let colDate = cols.colDate, colTime = cols.colTime, colGlucose = cols.colGlucose, pumpSN = cols.pumpSN;
            // Retrieve date time and glucose rows
            fileRows.forEach((row) => {
                if ((typeof row[0]).toString() === "string") {
                    if (row[0].includes("--")) {
                        cols = findInFileRows(fileRows, fileRows.indexOf(row));
                        colDate = cols.colDate;
                        colTime = cols.colTime;
                        colGlucose = cols.colGlucose;
                        pumpSN = cols.pumpSN;
                    }
                }
                if (((typeof row[colDate]).toString() === "string") && ((typeof row[colTime]).toString() === "string") && ((typeof row[colGlucose]).toString() === "string")) {
                    if ((row[colDate].includes('/')) && (row[colTime].includes(':') && (row[colGlucose].length >= 2))) {
                        dataObj.glucose.push(row[colGlucose]);
                        dataObj.date.push(row[colDate]);
                        dataObj.time.push(row[colTime]);
                        dataObj.pumpSN.push(pumpSN);
                    }
                }
            });

            try {
                // dataObj.date.length
                for (let i = 0; i < dataObj.date.length; i++) {
                    // let dbFormatDatetime = parseDatetime(dataObj.date[i], dataObj.time[i]);
                    let dbFormatDatetime = new Date(dataObj.date[i].substring(0, 4), dataObj.date[i].substring(5, 7) -1, dataObj.date[i].substring(8, 10), dataObj.time[i].split(':')[0], dataObj.time[i].split(':')[1]);
                    Data.create({
                        datetime: dbFormatDatetime,
                        glucose: parseInt(dataObj.glucose[i]),
                        pumpSN: dataObj.pumpSN[i],
                        userId: user.id
                    });
                }
                res.status(200).json('ok');
            } catch (e) {
                res.status(500).json('An error occured while insert data' + e);
            }
        });
}

function findInFileRows(fileRows, start) {
    let colDate = -1, colTime = -1, colGlucose = -1, pumpSN = "";
    // Find column numbers and pump serial number
    for (let row = start; row < fileRows.length; row++) {
        if (colGlucose < 0 || colTime < 0 || colGlucose < 0 || pumpSN === "") {
            for (let col = 0; col < fileRows[row].length; col++) {
                if ((typeof fileRows[row][col]).toString() === "string") {
                    if (colDate < 0) {
                        if (fileRows[row][col] === "Date")
                            colDate = fileRows[row].indexOf(fileRows[row][col]);
                    }
                    if (colTime < 0) {
                        if (fileRows[row][col] === "Time")
                            colTime = fileRows[row].indexOf(fileRows[row][col]);
                    }
                    if (colGlucose < 0) {
                        if (fileRows[row][col] === "Sensor Glucose (mg/dL)")
                            colGlucose = fileRows[row].indexOf(fileRows[row][col]);
                    }
                    if (pumpSN === "") {
                        if (fileRows[row][col] === "Sensor" || fileRows[row][col] === "Pump")
                            pumpSN = fileRows[row][col + 1];
                    }
                }
            }
        } else {
            break;
        }
    }
    return {colDate, colTime, colGlucose, pumpSN};
}

function parseDatetime(date, time) {
    console.log(new Date(date.substring(0, 4), date.substring(5, 7), date.substring(8, 10), time.split(':')[0], Math.floor(time.split(':')[1] / 5) * 5));
    return new Date(date.substring(0, 4), date.substring(5, 7), date.substring(8, 10), time.split(':')[0], Math.floor(time.split(':')[1] / 5) * 5);
}

// async function getAllData(tags, userId) {
//     let datetimeTag = {};
//     for (let i = 0; i < Object.keys(tags).length; i++) {
//         let datetime = tags[i].getDataValue('startDatetime').toISOString();
//         let fromHours = parseInt(datetime.substring(11, 13)) - 1;
//         fromHours = fromHours < 10 ? "0" + fromHours : fromHours;
//         let toHours = parseInt(datetime.substring(11, 13)) + 3;
//         toHours = toHours < 10 ? "0" + toHours : toHours;
//         let fromDate = datetime.substring(0, 11) + fromHours + datetime.substring(13, datetime.length);
//         let toDate = datetime.substring(0, 11) + toHours + datetime.substring(13, datetime.length);
//         datetimeTag[datetime] = await findFromDateToDate(fromDate, toDate, userId);
//     }
//
//     return datetimeTag;
// }

async function getAllDataFromTag(tags, userId) {
    let datetimeTag = {};
    for (let i = 0; i < Object.keys(tags).length; i++) {
        let datetime = new Date(tags[i].getDataValue('startDatetime'));
        let fromDate = new Date(datetime);
        fromDate.setHours(fromDate.getHours() - 1);
        let toDate = new Date(datetime);
        toDate.setHours(toDate.getHours() + 3);
        datetimeTag[datetime.toISOString()] = await findFromDateToDate(fromDate, toDate, userId)
    }
    return datetimeTag;
}

async function findFromDateToDate(fromDate, toDate, userId) {
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
    } catch (error) {
        return "findFromDateToDate request error";
    }
}

function addRelativeToAllData(realDatetimesTags) {
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

// function chartFormatAllData(allData) {
//     let chartData = [];
//     for (let i = 0; i < Object.keys(allData).length; i++) {
//         allData[Object.keys(allData)[i]].forEach((measure) => {
//             let e = measure.relative
//             let value = (e[0] + e.substring(1, e.length).split(':')[0] + e.substring(1, e.length).split(':')[1] + e.substring(1, e.length).split(':')[2]);
//             let dataTab = [];
//             for (let j = 0; j < Object.keys(allData).length; j++) {
//                 if (i === j) {
//                     dataTab[j] = measure.glucose;
//                 } else
//                     dataTab[j] = null;
//             }
//             chartData.push([value, dataTab]);
//         });
//     }
//     chartData.sort(function (a, b) {
//         return a[0] - b[0];
//     })
//     for (let i = 0; i < chartData.length; i++) {
//         chartData[i][0] = chartData[i][0].substring(0, 3) + ':' + chartData[i][0].substring(3, 5) + ':' + chartData[i][0].substring(5, 7);
//     }
//     return chartData;
// }

function chartFormatAllData(allData) {
    let chartData = [];
    Object.keys(allData).forEach((dataSet) => chartData.push(allData[dataSet].map((e) => e.relative)));

    let xAxis = []
    for (let i = 0; i < chartData.length; i++) {
        xAxis = xAxis.concat(chartData[i]);
    }
    let sortedXaxis = sortXaxis(xAxis)

    chartData = sortedXaxis.map((e) => [e, []]);
    for (let i = 0; i < Object.keys(allData).length; i++) {
        allData[Object.keys(allData)[i]].forEach((measure) => {
            let index = sortedXaxis.indexOf(measure.relative);
            chartData[index][1][i] = measure.glucose;
        });
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


function sortXaxis(xAxis) {
    for (let i = 0; i < xAxis.length; i++) {
        xAxis[i] = (xAxis[i][0] + xAxis[i].substring(1, xAxis[i].length).split(':')[0] + xAxis[i].substring(1, xAxis[i].length).split(':')[1] + xAxis[i].substring(1, xAxis[i].length).split(':')[2]);
    }
    xAxis.sort(function (a, b) {
        return a - b;
    })
    for (let i = 0; i < xAxis.length; i++) {
        xAxis[i] = xAxis[i].substring(0, 3) + ':' + xAxis[i].substring(3, 5) + ':' + xAxis[i].substring(5, 7);
    }
    return [...new Set(xAxis)];
}
