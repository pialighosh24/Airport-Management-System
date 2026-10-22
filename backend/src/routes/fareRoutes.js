const express = require('express');
const { getFares } = require('../controllers/fareController');

const router = express.Router();

router.get('/', getFares);

module.exports = router;
