'use strict';

// Memuat .env bila ada (Node >= 20.12). Variabel yang sudah ada di environment tidak ditimpa.
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch {
    // .env tidak wajib ada; nilai bisa datang dari environment sistem.
  }
}

const DEV_SECRET_PREFIX = 'dev-only-';

function intFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`Konfigurasi ${name} harus berupa bilangan bulat positif.`);
  }
  return n;
}

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error(
    'JWT_SECRET belum diatur atau terlalu pendek (minimal 32 karakter). ' +
      'Salin .env.example menjadi .env lalu isi JWT_SECRET.'
  );
}
if (process.env.NODE_ENV === 'production' && jwtSecret.startsWith(DEV_SECRET_PREFIX)) {
  throw new Error('JWT_SECRET bawaan .env.example tidak boleh dipakai di production.');
}

module.exports = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  port: intFromEnv('PORT', 3000),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtIssuer: 'simadu-api',
  bcryptRounds: intFromEnv('BCRYPT_ROUNDS', 10),
  loginRateLimitMax: intFromEnv('LOGIN_RATE_LIMIT_MAX', 10),
});
