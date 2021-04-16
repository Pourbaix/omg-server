const express = require('express');
const router = express.Router();
const ctrData = require("../controllers/ctrData");
const multer  = require('multer');
const upload = multer({dest: 'tmp/csv/'});

// Get one value
router.get('/one', ctrData.getOne);
// Upload file
router.post('/file', upload.single('file'), ctrData.postFile);

router.get('/chart', ctrData.chart)

module.exports = router;

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated())
        return next();
    return res.status(401).send({status: 'error', message: "You're not connected"});
}
