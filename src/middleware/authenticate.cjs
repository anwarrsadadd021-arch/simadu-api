'use strict';

const AppError = require('../utils/AppError.cjs');
const authService = require('../services/authService.cjs');
const userRepository = require('../repositories/userRepository.cjs');

/**
 * AUTENTIKASI: "siapa Anda?"
 * Membaca header `Authorization: Bearer <token>`, memverifikasi tanda tangan dan masa berlaku,
 * lalu menyimpan identitas ke req.user. Token tidak pernah dicatat ke log.
 */
function authenticate(req, _res, next) {
  const header = req.get('authorization');
  if (!header) {
    throw new AppError(401, 'Autentikasi diperlukan: sertakan header Authorization Bearer');
  }

  const [scheme, token, ...rest] = header.trim().split(/\s+/);
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token || rest.length > 0) {
    throw new AppError(401, 'Format header Authorization harus: Bearer <token>');
  }

  const payload = authService.verifyToken(token);

  // Pastikan pemilik token masih terdaftar (mis. akun yang sudah dihapus tidak lagi diterima).
  const user = userRepository.findById(payload.sub);
  if (!user) throw new AppError(401, 'Token tidak valid');

  req.user = { id: user.id, nama: user.nama, role: user.role };
  next();
}

module.exports = authenticate;
