const express = require('express');
const { generate, history, analyseRoute } = require('../controllers/contentController');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/generate',       protect, generate);
router.get('/history',         protect, history);
router.post('/analyse-trend',  protect, analyseRoute);

module.exports = router;
