'use strict';

const AppError = require('../utils/AppError.cjs');

const KATEGORI = ['Fasilitas', 'Akademik', 'TI'];
const STATUS = ['diajukan', 'diproses', 'selesai'];

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Body kosong (tanpa Content-Type JSON) diperlakukan sebagai {} lalu gagal di validasi field wajib. */
function getBody(req) {
  const body = req.body === undefined ? {} : req.body;
  if (!isPlainObject(body)) {
    throw new AppError(400, 'Body permintaan harus berupa objek JSON');
  }
  return body;
}

/** Menolak field yang tidak ada dalam daftar putih (mencegah mass assignment: id, mahasiswaId, status, dst). */
function checkUnknownFields(source, allowed, errors) {
  for (const key of Object.keys(source)) {
    if (!allowed.includes(key)) {
      errors.push({ field: key, message: 'Field tidak diperbolehkan' });
    }
  }
}

function checkString(source, field, { min, max }, errors) {
  const value = source[field];
  if (value === undefined || value === null) {
    errors.push({ field, message: 'Field wajib diisi' });
    return undefined;
  }
  if (typeof value !== 'string') {
    errors.push({ field, message: 'Harus berupa string' });
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    errors.push({ field, message: 'Field tidak boleh kosong' });
    return undefined;
  }
  if (trimmed.length < min || trimmed.length > max) {
    errors.push({ field, message: `Panjang harus antara ${min} dan ${max} karakter` });
    return undefined;
  }
  return trimmed;
}

function checkEnum(source, field, allowedValues, errors) {
  const value = source[field];
  if (value === undefined || value === null || value === '') {
    errors.push({ field, message: 'Field wajib diisi' });
    return undefined;
  }
  if (typeof value !== 'string' || !allowedValues.includes(value)) {
    errors.push({ field, message: `Harus salah satu dari: ${allowedValues.join(', ')}` });
    return undefined;
  }
  return value;
}

function finish(req, errors, validated) {
  if (errors.length > 0) {
    throw new AppError(400, 'Validasi gagal', errors);
  }
  req.validated = { ...(req.validated || {}), ...validated };
}

function validateLogin(req, _res, next) {
  const body = getBody(req);
  const errors = [];
  checkUnknownFields(body, ['username', 'password'], errors);
  const username = checkString(body, 'username', { min: 1, max: 50 }, errors);
  // Password tidak di-trim: spasi bisa menjadi bagian dari password.
  let password;
  if (body.password === undefined || body.password === null || body.password === '') {
    errors.push({ field: 'password', message: 'Field wajib diisi' });
  } else if (typeof body.password !== 'string' || body.password.length > 128) {
    errors.push({ field: 'password', message: 'Harus berupa string maksimal 128 karakter' });
  } else {
    password = body.password;
  }
  finish(req, errors, { username, password });
  next();
}

/** Parameter :id harus bilangan bulat positif. */
function validateId(req, _res, next) {
  if (!/^[1-9]\d{0,8}$/.test(req.params.id)) {
    throw new AppError(400, 'Validasi gagal', [
      { field: 'id', message: 'ID harus berupa bilangan bulat positif' },
    ]);
  }
  req.validated = { ...(req.validated || {}), id: Number(req.params.id) };
  next();
}

const PENGADUAN_FIELDS = ['judul', 'kategori', 'deskripsi'];

/** Dipakai untuk POST dan PUT: hanya judul, kategori, deskripsi yang boleh dikirim. */
function validatePengaduanBody(req, _res, next) {
  const body = getBody(req);
  const errors = [];
  checkUnknownFields(body, PENGADUAN_FIELDS, errors);
  const judul = checkString(body, 'judul', { min: 3, max: 100 }, errors);
  const kategori = checkEnum(body, 'kategori', KATEGORI, errors);
  const deskripsi = checkString(body, 'deskripsi', { min: 10, max: 1000 }, errors);
  finish(req, errors, { input: { judul, kategori, deskripsi } });
  next();
}

function validateStatusBody(req, _res, next) {
  const body = getBody(req);
  const errors = [];
  checkUnknownFields(body, ['status'], errors);
  const status = checkEnum(body, 'status', STATUS, errors);
  finish(req, errors, { status });
  next();
}

function validateListQuery(req, _res, next) {
  const query = req.query;
  const errors = [];
  checkUnknownFields(query, ['status', 'kategori'], errors);
  const filters = {};
  for (const [field, allowed] of [
    ['status', STATUS],
    ['kategori', KATEGORI],
  ]) {
    if (query[field] !== undefined) {
      if (typeof query[field] !== 'string' || !allowed.includes(query[field])) {
        errors.push({ field, message: `Harus salah satu dari: ${allowed.join(', ')}` });
      } else {
        filters[field] = query[field];
      }
    }
  }
  finish(req, errors, { filters });
  next();
}

module.exports = {
  validateLogin,
  validateId,
  validatePengaduanBody,
  validateStatusBody,
  validateListQuery,
};
