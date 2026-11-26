'use strict';

const authService = require('../services/authService.cjs');
const { sendSuccess } = require('../utils/response.cjs');

async function login(req, res) {
  const { username, password } = req.validated;
  const result = await authService.login(username, password);
  return sendSuccess(res, 200, 'Login berhasil', result);
}

module.exports = { login };
