'use strict';

/** Format respons sukses yang konsisten: { success, message, data } */
function sendSuccess(res, statusCode, message, data) {
  const body = { success: true, message };
  if (data !== undefined) body.data = data;
  return res.status(statusCode).json(body);
}

/** Format respons gagal yang konsisten: { success, message, errors? } */
function sendError(res, statusCode, message, errors) {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
}

module.exports = { sendSuccess, sendError };
