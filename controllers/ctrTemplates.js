const Tag = require("../models/modelTag");
const Data = require("../models/modelData");
const ctrData = require('../controllers/ctrData');
const ctrTags = require('../controllers/ctrTag');
const seq = require("../config/config");
const Sequelize = seq.Sequelize, sequelize = seq.sequelize;
const Chart = require('chart.js');

// Router functions

exports.showChartsByTag = async function (req, res) {
    const tags = await ctrTags.getTagsFromName(req.query.tagName, req.query.userId)
    let realDatetimesTags = await getAllData(tags, req.query.userId);
    let relativeTimesTags = realDatetimesTags;
    let tab = [];
    Object.keys(relativeTimesTags).forEach((e) => {
        relativeTimesTags[e].forEach((measure) => {
            let eventDate = new Date(e);
            let realDate = new Date(measure.datetime);
            tab.push(dateDiff(eventDate, realDate));

        })
    });
    res.status(200).send(tab);

}

// Others functions

async function getAllData(tags, userId) {
    let datetimeTag = {};
    for (let i = 0; i < Object.keys(tags).length; i++) {
        let datetime = tags[i].getDataValue('startDatetime').toISOString();
        let hours = parseInt(datetime.substring(11, 13)) - 1;
        hours = hours < 10 ? "0" + hours : hours;
        let fromDate = datetime.substring(0, 11) + hours + datetime.substring(13, datetime.length);
        let toDate = datetime.substring(0, 11) + (parseInt(datetime.substring(11, 13)) + 3).toString() + datetime.substring(13, datetime.length);
        datetimeTag[datetime] = await ctrData.findFromDateToDate(fromDate, toDate, userId);
    }
    return datetimeTag;
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

    Object.keys(s).forEach(function(key){
        r[key] = Math.floor(d / s[key]);
        d -= r[key] * s[key];
        tab.push(r[key]);
    });

// for example: {year:0,month:0,week:1,day:2,hour:34,minute:56,second:7}
    return tab;
}
