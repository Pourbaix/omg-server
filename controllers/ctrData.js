const Data = require("../models/modelData");
const seq = require("../config/config");
const Sequelize = seq.Sequelize, sequelize = seq.sequelize;
const csv = require('fast-csv');
const fs = require('fs');
const ctrTags = require('../controllers/ctrTag');

exports.getOne = function (req, res) {
    Data.findAll({
        where: {
            id: req.params.id
        }
    })
        .then(results => res.json(results[0]))
        .catch(error => res.render('500'));
};

exports.findFromDateToDate = async function (fromDate, toDate, userId) {
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

exports.postFile = function (req, res) {
    if (!req.file) {
        return res.status(400).send('No files were uploaded.');
    }
    getFromMiniMedPump(req, res);
}

function getFromMiniMedPump(req, res) {
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
                    //console.log(dbFormatDatetime)
                    Data.create({
                        datetime: dbFormatDatetime,
                        glucose: parseInt(dataObj.glucose[i]),
                        userId: "a301cca5-165c-4197-952b-d302343b876a"
                    });
                }
            } catch (e) {
                res.render('500');
            } finally {
                res.render('uploadSuccessful');
            }
        });
}

function parseDatetime(date, time) {
    return date.substring(0, 4) + "-" + date.substring(5, 7) + "-" + date.substring(8, 10) + "T" + time + "Z"
}
