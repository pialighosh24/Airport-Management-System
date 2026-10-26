const express = require('express');
const { getTasks, getTask, createTask, updateTask } = require('../controllers/groundOperationsController');

const router = express.Router();

router.get('/', getTasks);
router.get('/:id', getTask);
router.post('/', createTask);
router.patch('/:id', updateTask);

module.exports = router;
