'use strict';

const AppError = require('../utils/AppError.cjs');

/**
 * OTORISASI (level role): "apakah Anda boleh melakukan operasi ini?"
 * Dipasang SETELAH authenticate. Pemeriksaan kepemilikan data (level objek)
 * dilakukan di service karena membutuhkan data pengaduan.
 */
function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      throw new AppError(401, 'Autentikasi diperlukan');
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(403, 'Role Anda tidak diizinkan melakukan operasi ini');
    }
    next();
  };
}

module.exports = { requireRole };
