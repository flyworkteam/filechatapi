const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.post('/session', chatController.loadSession);
router.post('/message', chatController.sendMessage);
router.post('/clear', chatController.clearChat);
router.get('/user/:userId', chatController.getUserChats);

module.exports = router;
