'use strict';

const service = require('../services/pengaduanService.cjs');
const { sendSuccess } = require('../utils/response.cjs');

/** Controller tipis: ambil input tervalidasi, panggil service, bentuk respons HTTP. */

function list(req, res) {
  const data = service.list(req.user, req.validated.filters);
  return sendSuccess(res, 200, 'Daftar pengaduan berhasil diambil', data);
}

function getById(req, res) {
  const data = service.getById(req.user, req.validated.id);
  return sendSuccess(res, 200, 'Detail pengaduan berhasil diambil', data);
}

function create(req, res) {
  const data = service.create(req.user, req.validated.input);
  return sendSuccess(res, 201, 'Pengaduan berhasil dibuat', data);
}

function update(req, res) {
  const data = service.update(req.user, req.validated.id, req.validated.input);
  return sendSuccess(res, 200, 'Pengaduan berhasil diperbarui', data);
}

function updateStatus(req, res) {
  const data = service.updateStatus(req.validated.id, req.validated.status);
  return sendSuccess(res, 200, 'Status pengaduan berhasil diperbarui', data);
}

function remove(req, res) {
  service.remove(req.user, req.validated.id);
  return sendSuccess(res, 200, 'Pengaduan berhasil dihapus');
}

module.exports = { list, getById, create, update, updateStatus, remove };
