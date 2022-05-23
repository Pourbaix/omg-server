const GlucoseData = require("../models/modelGlucoseData");
const Bolus = require("../models/modelBolus");
const seq = require("../config/config");
const ctrTag = require("../controllers/ctrTag");
const Sequelize = seq.Sequelize, sequelize = seq.sequelize;
const csv = require('fast-csv');
const fs = require('fs');
const passport = require("../app");
const {Op} = require("sequelize");

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
            if (!"fromTime" in req.query || !"toTime" in req.query){
                return res.json({status: 'error', message: "missing time range"});
            }
            let fromToTime = [req.query.fromTime, req.query.toTime]

            let fromToDate = null
            if ("startDate" in req.query && "endDate" in req.query) {
                fromToDate = [req.query.startDate, req.query.endDate];
            }
            let weekDays = []
            if ("weekDays" in req.query) {
                weekDays = req.query.weekDays.split("-").map(day => parseInt(day));
            }

            let allData = await getAllDataFromTag(await ctrTag.getTagsFromName(req.query.tagName, user.id, fromToDate, weekDays), user.id, fromToTime);
            let response = {
                'datasetsLabel': Object.keys(allData),
                'chartData': chartFormatAllData(addRelativeToAllData(allData))
            };
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
            if (!req.body.sensorModel) {
                return res.status(400).json('No sensor model in the request.');
            }
            if (!req.body.importName) {
                return res.status(400).json('No import name in the request.');
            }
            if (!req.file) {
                return res.status(400).json('No file were uploaded.');
            }
            if (req.file.originalname.split(".")[1] !== "csv") {
                return res.status(400).json('Only CSV files are allowed.');
            }
            // let response = Data.findAll({
            //     where: {
            //         userId: user.id
            //     },
            //     attributes: [[sequelize.fn('DISTINCT', sequelize.col('data.datetime')), 'date']]
            // });
            // // response.map(date => date.dataValues.date);
            // console.log(response);
            switch (req.body.sensorModel) {
                case "minimed":
                    getFromMiniMedPump(req, res, user, req.body.importName);
                    break;
                default:
                    return res.status(400).json("Sensor model not implemented.");
            }
        })(req, res);
    } catch (e) {
        res.status(500).json(e);
    }
}
/**
 * Get all the days from data
 *
 * @param req
 * @param res
 */
exports.getDataDays = async function (req, res) {
    try {
        passport.authenticate('local-jwt', {session: false}, async function (err, user) {
            if (err) {
                return res.json({status: 'Authentication error', message: err});
            }
            if (!user) {
                return res.json({status: 'error', message: "Incorrect token"});
            }
            let response = await GlucoseData.findAll({
                where: {
                    userId: user.id
                },
                attributes: [[sequelize.fn('DISTINCT', sequelize.cast(sequelize.col('glucosedata.datetime'), 'date')), 'date']]
            });
            res.status(200).json(response.map(date => date.dataValues.date));
        })(req, res);
    } catch (e) {
        res.status(500).json(e);
    }
}
/**
 * Get all datetime from data
 *
 * @param req
 * @param res
 */
exports.getDataDatetime = async function (req, res) {
    try {
        passport.authenticate('local-jwt', {session: false}, async function (err, user) {
            if (err) {
                return res.json({status: 'Authentication error', message: err});
            }
            if (!user) {
                return res.json({status: 'error', message: "Incorrect token"});
            }
            let response = await GlucoseData.findAll({
                where: {
                    userId: user.id
                },
                attributes: [[sequelize.fn('DISTINCT', sequelize.col('glucosedata.datetime')), 'date']]
            });
            res.status(200).json(response.map(date => date.dataValues.date));
        })(req, res);
    } catch (e) {
        res.status(500).json(e);
    }
}
/**
 * Get distinct import names
 *
 * @param req
 * @param res
 * @return {Promise<void>}
 */
exports.getImportNames = async function (req, res) {
    try {
        passport.authenticate('local-jwt', {session: false}, async function (err, user) {
            if (err) {
                return res.json({status: 'Authentication error', message: err});
            }
            if (!user) {
                return res.json({status: 'error', message: "Incorrect token"});
            }
            let response = await GlucoseData.findAll({
                where: {
                    userId: user.id
                },
                attributes: [[sequelize.fn('DISTINCT', sequelize.col('importName')), 'importName']]
            });
            res.status(200).json(response.map(name => name.dataValues.importName));
        })(req, res);
    } catch (e) {
        res.status(500).json(e);
    }
}
/**
 * delete data of an import
 *
 * @param req
 * @param res
 * @return {Promise<void>}
 */
exports.deleteFile = async function (req, res) {
    try {
        passport.authenticate('local-jwt', {session: false}, async function (err, user) {
            if (err) {
                return res.json({status: 'Authentication error', message: err});
            }
            if (!user) {
                return res.json({status: 'error', message: "Incorrect token"});
            }
            if (!req.body.importName) {
                return res.status(400).json('No import name in the request.');
            }
            let response = await GlucoseData.destroy({
                where: {
                    userId: user.id,
                    ImportName: req.body.importName
                }
            });
            // console.log(response);
            res.status(200).json("data of '" + req.body.importName + "' import deleted.");
        })(req, res);
    } catch (e) {
        res.status(500).json(e);
    }
}
/**
 * Delete all data of a user
 *
 * @param req
 * @param res
 * @return {Promise<void>}
 */
exports.deleteAll = async function (req, res) {
    try {
        passport.authenticate('local-jwt', {session: false}, async function (err, user) {
            if (err) {
                return res.json({status: 'Authentication error', message: err});
            }
            if (!user) {
                return res.json({status: 'error', message: "Incorrect token"});
            }
            let response = await GlucoseData.destroy({
                where: {
                    userId: user.id
                }
            });
            res.status(200).json("All data deleted.");
        })(req, res);
    } catch (e) {
        res.status(500).json(e);
    }
}
//////////////////////////////////////////////////////
/////////// controllers functions helpers ////////////
//////////////////////////////////////////////////////
async function getDatetimesDB(user){
    let response = GlucoseData.findAll({
        where: {
            userId: user.id
        },
        attributes: [[sequelize.fn('DISTINCT', sequelize.col('glucosedata.datetime')), 'date']]
    });

    // console.log(typeof await response);
    return await response;

}

async function insertIfNoDup(dataObj, importName, user){

    let seeDup = 0;
    let seeInsert = 0;
    // console.log("carb date length: " + dataObj.carbDate.length + "\n" + dataObj.carbTime.length + "\ncarb length: " + dataObj.carbInput.length);

    for (let i = 0; i < dataObj.date.length; i++) {
        // console.log("carb date : " + dataObj.carbDate[i] + "\n" + dataObj.carbTime[i] + "\ncarb : " + dataObj.carbInput[i]);
        // console.log("REGARDE ICI "+dataObj.date[i] + "--------" +dataObj.time[i]);
        let dbFormatDatetime = formatDatetime(dataObj.date[i], dataObj.time[i]);
        await GlucoseData.findOne(
            { logging: false,
                where: {
                    [Op.and]: [
                        {datetime: dbFormatDatetime},
                        {userId: user.id}
                    ]
                },
                // where: {
                //     datetime: dbFormatDatetime
                // }
            }).then((res) => {
            if (res){
                // console.log("res: "+res+"   index: "+i);
                console.log(seeDup++);
            }
            else {
                GlucoseData.create({
                    datetime: dbFormatDatetime,
                    glucose: parseInt(dataObj.glucose[i]),
                    pumpSN: dataObj.pumpSN[i],
                    importName: importName,
                    userId: user.id,
                }).then(console.log(seeInsert++));
            }
        });
    }
    for(let z = 0; z < dataObj.carbDate.length; z++){
        let dbFormatDatetime = formatDatetimeWithoutRound(dataObj.carbDate[z], dataObj.carbTime[z]);
        await Bolus.findOne(
            { logging: false,
                where: {
                    [Op.and]: [
                        {datetime: dbFormatDatetime},
                        {userId: user.id}
                    ]
                },
                // where: {
                //     datetime: dbFormatDatetime
                // }
            }).then((res) => {
            if (res){
                // console.log("res: "+res+"   index: "+i);
                // console.log(seeDup++);
                // console.log("dup in Bolus");
            }
            else {
                Bolus.create({
                    datetime: dbFormatDatetime,
                    carbInput: parseInt(dataObj.carbInput[z]),
                    // carbInput: 99,
                    userId: user.id,
                }).then(console.log(seeInsert++));
            }
        });
        // console.log("carb date : " + dataObj.carbDate[z] + "\n" + dataObj.carbTime[z] + "\ncarb : " + dataObj.carbInput[z]);

    }
    return [seeDup, seeInsert];
}
/**
 *  Minimed import method
 *
 * @param req
 * @param res
 * @param user : object of a user context
 * @param importName
 */
function getFromMiniMedPump(req, res, user, importName) {
    // getDatetimesDB(user).then((response) => console.log(JSON.stringify(response)));
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
            let dataObj = {'date': [], 'time': [], 'glucose': [], 'pumpSN': [], 'carbDate': [], 'carbTime': [], 'carbInput': []};
            let cols = findInFileRows(fileRows, 0);
            let colDate = cols.colDate, colTime = cols.colTime, colGlucose = cols.colGlucose, pumpSN = cols.pumpSN, colCarbInput = cols.colCarbInput;
            // console.log("coldate : " + colDate + "\n" + colTime + "\n" + colGlucose + "\ncarb: " + colCarbInput);
            // Retrieve date time and glucose rows
            let i = 0;
            fileRows.forEach((row) => {
                if ((typeof row[0]).toString() === "string") {
                    if (row[0].includes("--")) {
                        cols = findInFileRows(fileRows, fileRows.indexOf(row));
                        colDate = cols.colDate;
                        colTime = cols.colTime;
                        colGlucose = cols.colGlucose;
                        pumpSN = cols.pumpSN;
                        colCarbInput = cols.colCarbInput;
                        // console.log("coldate : " + colDate + "\n" + colTime + "\n" + colGlucose + "\ncarb: " + colCarbInput);
                    }
                }
                if (((typeof row[colDate]).toString() === "string") && ((typeof row[colTime]).toString() === "string") && ((typeof row[colGlucose]).toString() === "string")) {
                    if ((row[colDate].includes('/')) && (row[colTime].includes(':') && (row[colGlucose].length >= 2))) {
                        // if(i===0) {
                        //     i++;
                        //     console.log("DATE NEED TO BE REVERSED ? " + row[colDate].substr(0, 3).includes('/'));
                        //     if(row[colDate].substr(0, 3).includes('/')){
                        //         let dateArray = row[colDate].split('/');
                        //         const reversed = dateArray.reverse();
                        //         console.log(reversed.toString().replace(/,/g, '/'));
                        //     }
                        // }
                        if(row[colDate].substr(0, 3).includes('/')){
                            let dateArray = row[colDate].split('/');
                            const reversed = dateArray.reverse();
                            dataObj.date.push(reversed.toString().replace(/,/g, '/'));
                        }
                        else {
                            dataObj.date.push(row[colDate]);
                        }
                        // console.log("DB INSERTION: "+dataObj.date); attention
                        dataObj.time.push(row[colTime]);
                        dataObj.glucose.push(row[colGlucose]);
                        dataObj.pumpSN.push(pumpSN);
                        // dataObj.carbInput.push(row[colCarbInput]);
                        // console.log(row[carbInput]);
                    }
                }
                if((typeof row[colCarbInput]).toString() === "string" && ((typeof row[colDate]).toString() === "string") && ((typeof row[colTime]).toString() === "string")){
                    if ((row[colDate].includes('/')) && (row[colTime].includes(':') && row[colCarbInput].length > 0)){
                        if(row[colDate].substr(0, 3).includes('/')){
                            let dateArray = row[colDate].split('/');
                            const reversed = dateArray.reverse();
                            dataObj.carbDate.push(reversed.toString().replace(/,/g, '/'));
                        }
                        else {
                            dataObj.carbDate.push(row[colDate]);
                        }
                        // dataObj.carbDate.push(row[colDate]);
                        dataObj.carbTime.push(row[colTime]);
                        dataObj.carbInput.push(row[colCarbInput]);
                    }
                }
            });

            try {
                insertIfNoDup(dataObj, importName, user).then((see) => {
                    // console.log(see[0] + "--" + see[1]);
                    res.status(200).json({status: 'ok', seeDup: see[0], seeInsert: see[1]});
                });
            } catch (e) {
                res.status(500).json('An error occured while insert data' + e);
            }
        });
}


function getGMT(strDate, strTime, strTimeToCompare){
    let myDate = new Date(strDate+" "+strTime);
    let myDateHoursOnly = myDate.getHours();

    let myDate2hoursDeDiffInVPS = new Date(strDate+" "+strTimeToCompare);
    let myDate2hoursDeDiffInVPSHoursOnly = myDate2hoursDeDiffInVPS.getHours();

    let sgo = myDate - myDate2hoursDeDiffInVPS; //-7200000
    console.log(myDate + "-" + myDate2hoursDeDiffInVPS+ "==="+sgo);
    if(myDateHoursOnly===myDate2hoursDeDiffInVPSHoursOnly){
        return 0;
    }
    if(myDateHoursOnly>myDate2hoursDeDiffInVPS){
        let GMT = (sgo/3600000)-24;
        console.log("cetait -24 et maintenant c'est -2 : " +GMT);
        return GMT;
    }
    else{
        let GMT = sgo/3600000;
        console.log(GMT);
        return GMT;
    }
}
/**
 * take date and time to return datetime
 *
 * @param strDate 2022/04/21
 * @param strTime 06:29:00
 * objDatetime Thu Apr 21 2022 06:29:00 GMT+0200 (heure d’été d’Europe centrale)
 * @return {string} 2022-04-23T04:55:00.000Z
 * 2022-04-21T01:55:00.000Z
 */

function formatDatetime(strDate, strTime){
    // 2022/04/21 06:29:00
    let objDatetime = new Date(strDate.substring(0, 4), strDate.substring(5, 7) -1, strDate.substring(8, 10), strTime.split(':')[0], strTime.split(':')[1]);
    let localDatetime = new Date(strDate.substring(0, 4), strDate.substring(5, 7) -1, strDate.substring(8, 10), strTime.split(':')[0], strTime.split(':')[1])
        .toLocaleString('be-BE', {
            timeZone: 'CET'
        });
    // Thu Apr 20 2022 06:44:00 GMT+0200 (heure d’été d’Europe centrale)
    console.log("strDate: " + strDate + "strTime: " + strTime);
    // let objDatetime = new Date(strDate+" "+ strTime);

    // console.log("objDatetime: " + objDatetime);
    // console.log("(string) localDatetime: " + localDatetime); // 20.4.2022, 08:44:00
    // console.log("(invalid) localDatetime: " + new Date(localDatetime)); // Invalid Date

    let localDate = localDatetime.split(',')[0];
    let localTime = localDatetime.split(',')[1];
    console.log("(localDatetime) date(balek): " + localDate + " \n(localDatetime) time(-->): " + localTime);

    let gmt = getGMT(strDate, strTime, localTime);

    let year = parseInt(localDate.split('.')[2]);
    let month = parseInt(localDate.split('.')[1]);
    let day = parseInt(localDate.split('.')[0]);
    console.log((parseInt(strTime.split(':')[0]))+"°°°°°°°°°°°"+gmt);
    let hours = (parseInt(strTime.split(':')[0]))+gmt;
    let minutes = parseInt(strTime.split(':')[1]);

    console.log("(localDate) year: " + year + " \n(localDate) month: " + month + " \n(localDate) day: " + day);
    console.log("(localTime) hours: " + hours + " \n(localTime) minutes: " + minutes);

    //                                      new Date(year, monthIndex, day, hours, minutes)
    console.log("(date) localDatetime " + new Date(year, month, day, hours, minutes));
    // let almostFinalDatetime = new Date(year, month, day, hours, minutes);

    let coeff = 1000 * 60 * 5;
    // return new Date(Math.trunc(objDatetime.getTime() / coeff) * coeff)
    let almostFinalDatetime = new Date(Math.trunc(objDatetime.getTime() / coeff) * coeff);
    console.log(almostFinalDatetime.toISOString());
    let isoDate = almostFinalDatetime.toISOString();
    return isoDate;
}
function formatDatetimeWithoutRound(strDate, strTime){
    let objDatetime = new Date(strDate.substring(0, 4), strDate.substring(5, 7) -1, strDate.substring(8, 10), strTime.split(':')[0], strTime.split(':')[1]);
    // return new Date(objDatetime.getTime());
    let finalDatetime = new Date(objDatetime.getTime());
    let isoDate = finalDatetime.toISOString();
    return isoDate;
}
/**
 * find the column number of time, date and glucose in the filerows array at start line.
 *
 * @param fileRows : array of the csv file
 * @param start : number of the line (where to start)
 * @return {{colTime: number, pumpSN: string, colGlucose: number, colDate: number}}
 */
function findInFileRows(fileRows, start) {
    let colDate = -1, colTime = -1, colGlucose = -1, pumpSN = "", colCarbInput = -1;
    // Find column numbers and pump serial number
    for (let row = start; row < fileRows.length; row++) {
        if (colGlucose < 0 || colTime < 0 || colGlucose < 0 || pumpSN === "" || colCarbInput < 0) {
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
                    if (colCarbInput < 0) {
                        if (fileRows[row][col] === "BWZ Carb Input (grams)")
                            colCarbInput = fileRows[row].indexOf(fileRows[row][col]);
                    }
                }
            }
        } else {
            break;
        }
    }
    return {colDate, colTime, colGlucose, pumpSN, colCarbInput};
}
/**
 * Retrieve all user's data according to the given tags.
 *
 * @param tags : object which contains all the activations of a tag
 * @param userId : string
 * @param fromToTime
 * @return {Promise<{}>} : object with all data
 */
async function getAllDataFromTag(tags, userId, fromToTime) {
    let datetimeTag = {};
    for (let i = 0; i < Object.keys(tags).length; i++) {
        let datetime = new Date(tags[i].getDataValue('startDatetime'));
        let fromDate = new Date(datetime);
        fromDate.setHours(fromDate.getHours() + parseInt(fromToTime[0]));
        let toDate = new Date(datetime);
        toDate.setHours(toDate.getHours() + parseInt(fromToTime[1]));
        datetimeTag[datetime.toISOString()] = await findFromDateToDate(fromDate, toDate, userId)
    }
    return datetimeTag;
}
/**
 * Retrieve data between two dates.
 *
 * @param fromDate : Date start
 * @param toDate : Date end
 * @param userId : string
 * @return {Promise<*|string>} : object data
 */
async function findFromDateToDate(fromDate, toDate, userId) {
    try {
        const results = await GlucoseData.findAll({
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
/**
 * modifies the data object by replacing the absolute dates by times relative to the activation of a tag
 *
 * @param realDatetimesTags : object
 * @return {any} : relativeTimesTags object
 */
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
/**
 * manipulates the data of the all data object to facilitate the processing of the chart display in the web application.
 *
 * @param allData : object
 * @return {*|[]} : object chart data
 */
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
/**
 * Calculate the time between two dates
 *
 * @param eventDate : Date main
 * @param realDate : Date relative
 * @return {[]} : string with time difference between the two dates
 */
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
/**
 * sort datetimes of the xAxis
 *
 * @param xAxis : Array of datetimes
 * @return {any[]} : Array of sorted datetimes
 */
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
