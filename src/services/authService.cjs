'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const config = require('../config.cjs');
const AppError = require('../utils/AppError.cjs');
const userRepository = require('../repositories/userRepository.cjs');

/**
 * Autentikasi: memverifikasi kredensial lalu menerbitkan token bertanda tangan.
 * Token berisi identitas (sub) dan role, memiliki jti unik, dan kedaluwarsa sesuai konfigurasi.
 * Pesan kegagalan sengaja sama untuk "username tidak ada" dan "password salah".
 */
async function login(username, password) {
  const user = userRepository.findByUsername(username);
  const hashToCompare = user ? user.passwordHash : userRepository.DUMMY_HASH;
  const passwordOk = await bcrypt.compare(password, hashToCompare);

  if (!user || !passwordOk) {
    throw new AppError(401, 'Username atau password salah');
  }

  const token = jwt.sign({ role: user.role, nama: user.nama }, config.jwtSecret, {
    algorithm: 'HS256',
    subject: user.id,
    issuer: config.jwtIssuer,
    expiresIn: config.jwtExpiresIn,
    jwtid: crypto.randomUUID(),
  });

  return {
    token,
    tokenType: 'Bearer',
    expiresIn: config.jwtExpiresIn,
    user: { id: user.id, nama: user.nama, role: user.role },
  };
}

/** Memverifikasi token; melempar AppError 401 bila tidak sah atau kedaluwarsa. */
function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret, {
      algorithms: ['HS256'],
      issuer: config.jwtIssuer,
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError(401, 'Token telah kedaluwarsa, silakan login kembali');
    }
    throw new AppError(401, 'Token tidak valid');
  }
}

module.exports = { login, verifyToken };
