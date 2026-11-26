'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const config = require('../config.cjs');
const { validateLogin } = require('../middleware/validate.cjs');
const authController = require('../controllers/authController.cjs');
const { sendError } = require('../utils/response.cjs');

const router = express.Router();

// Pembatasan percobaan login untuk memperlambat tebak-password (brute force).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.loginRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => sendError(res, 429, 'Terlalu banyak percobaan login, coba lagi nanti'),
});

router.post('/login', loginLimiter, validateLogin, authController.login);

module.exports = router;
