const express = require('express');
const { generate, history, analyseRoute, screenplay } = require('../controllers/contentController');
const protect = require('../middleware/authMiddleware');
const checkQuota = require('../middleware/quotaMiddleware');

const router = express.Router();

router.post('/generate',       protect, checkQuota, generate);
router.get('/history',         protect, history);
router.post('/analyse-trend',  protect, checkQuota, analyseRoute);
router.post('/screenplay',     protect, checkQuota, screenplay);

module.exports = router;
