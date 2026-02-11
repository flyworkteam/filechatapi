const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// POST /api/users/splash-login
router.post('/auth', userController.splashLogin);
router.post('/make-premium', userController.enablePremium);
router.post('/remove-premium', userController.disablePremium);


module.exports = router;