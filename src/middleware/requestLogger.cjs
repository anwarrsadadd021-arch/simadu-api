'use strict';

/**
 * Log akses sederhana: method, path, status, durasi.
 * Sengaja TIDAK mencatat header (Authorization/token), query string, maupun body (berisi password).
 */
function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const path = req.originalUrl.split('?')[0];
    console.log(`${req.method} ${path} ${res.statusCode} ${ms.toFixed(1)}ms`);
  });
  next();
}

module.exports = requestLogger;
