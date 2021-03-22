const express = require('express');
const router = express.Router();
const ctrTemplates = require('../controllers/ctrTemplates');

router.get('/index', (req, res) => res.render('index'));

router.get('/error', (req, res) => res.render('404'));

router.get('/upload', (req, res) => res.render('upload'));

router.get('/chartsByTag', (req, res) => ctrTemplates.showChartsByTag(req, res));

router.get('/500', (req, res) => res.render('500'));

module.exports = router;
