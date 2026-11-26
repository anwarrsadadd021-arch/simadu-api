'use strict';

const AppError = require('../utils/AppError.cjs');
const config = require('../config.cjs');
const { sendError } = require('../utils/response.cjs');

/** Rute yang tidak dikenal -> 404 dengan format yang sama. */
function notFound(_req, _res, next) {
  next(new AppError(404, 'Endpoint tidak ditemukan'));
}

/**
 * Error handler terpusat. Semua error dari middleware/controller/service berakhir di sini.
 * - AppError: pesan aman, dikirim apa adanya.
 * - Body JSON rusak / terlalu besar: dipetakan ke 400 / 413.
 * - Selain itu: 500 dengan pesan generik. Detail (stack, pesan internal) TIDAK dikirim ke client.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return sendError(res, err.statusCode, err.message, err.errors);
  }
  if (err && err.type === 'entity.parse.failed') {
    return sendError(res, 400, 'Format JSON pada body tidak valid');
  }
  if (err && err.type === 'entity.too.large') {
    return sendError(res, 413, 'Ukuran body terlalu besar');
  }

  // Log internal tanpa header Authorization/token dan tanpa body permintaan.
  if (config.env !== 'test') {
    const path = req.originalUrl.split('?')[0];
    console.error(`[ERROR] ${req.method} ${path} -> ${err && err.name}: ${err && err.message}`);
  }
  return sendError(res, 500, 'Terjadi kesalahan pada server');
}

module.exports = { notFound, errorHandler };
