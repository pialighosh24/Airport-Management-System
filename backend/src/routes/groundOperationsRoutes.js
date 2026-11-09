const express = require('express');
const { getTasks, getTask, createTask, updateTask } = require('../controllers/groundOperationsController');
const { authenticateToken, requireStaff } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getTasks);
router.get('/:id', getTask);
router.post('/', authenticateToken, requireStaff, createTask);
router.patch('/:id', authenticateToken, requireStaff, updateTask);

module.exports = router;
