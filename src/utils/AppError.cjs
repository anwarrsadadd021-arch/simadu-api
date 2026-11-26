'use strict';

/**
 * Error yang sengaja dilempar aplikasi (operasional).
 * Pesan pada AppError aman ditampilkan ke client; error lain dianggap 500 dan disamarkan.
 */
class AppError extends Error {
  constructor(statusCode, message, errors) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    if (errors) this.errors = errors;
  }
}

module.exports = AppError;
