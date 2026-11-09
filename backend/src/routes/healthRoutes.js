const express = require('express');
const { getHealth, getLiveness } = require('../controllers/healthController');

const router = express.Router();

router.get('/liveness', getLiveness);
router.get('/', getHealth);

module.exports = router;
