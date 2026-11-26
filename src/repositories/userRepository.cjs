'use strict';

const bcrypt = require('bcryptjs');
const config = require('../config.cjs');

/**
 * Penyimpanan pengguna (dalam memori).
 *
 * Password HANYA disimpan dalam bentuk hash bcrypt. Password plaintext di bawah ini
 * hanyalah data uji latihan untuk di-hash saat server menyala; pada sistem nyata
 * pengguna berasal dari database dan tidak ada plaintext di kode sumber.
 */
const SEED_USERS = [
  { id: 'M2024001', username: 'budi', nama: 'Budi Santoso', role: 'mahasiswa', password: 'Budi#2026' },
  { id: 'M2024002', username: 'siti', nama: 'Siti Aminah', role: 'mahasiswa', password: 'Siti#2026' },
  { id: 'A001', username: 'admin', nama: 'Administrator SIMADU', role: 'admin', password: 'Admin#2026' },
];

const users = SEED_USERS.map(({ password, ...rest }) => ({
  ...rest,
  passwordHash: bcrypt.hashSync(password, config.bcryptRounds),
}));

// Hash pembanding agar waktu respons login tidak membocorkan apakah username ada.
const DUMMY_HASH = bcrypt.hashSync('tidak-dipakai-untuk-login', config.bcryptRounds);

function findByUsername(username) {
  return users.find((u) => u.username === username) || null;
}

function findById(id) {
  return users.find((u) => u.id === id) || null;
}

module.exports = { findByUsername, findById, DUMMY_HASH };
