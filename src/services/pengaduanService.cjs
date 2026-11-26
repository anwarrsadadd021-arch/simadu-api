'use strict';

const AppError = require('../utils/AppError.cjs');
const repo = require('../repositories/pengaduanRepository.cjs');

const isAdmin = (user) => user.role === 'admin';

/** Mengambil pengaduan atau 404. */
function getExisting(id) {
  const item = repo.findById(id);
  if (!item) throw new AppError(404, 'Pengaduan tidak ditemukan');
  return item;
}

/** Aturan kepemilikan: hanya pemilik yang boleh mengubah/menghapus, dan hanya saat berstatus diajukan. */
function assertOwnerAndEditable(user, item) {
  if (item.mahasiswaId !== user.id) {
    throw new AppError(403, 'Anda tidak berhak mengakses pengaduan ini');
  }
  if (item.status !== 'diajukan') {
    throw new AppError(409, 'Pengaduan hanya dapat diubah atau dihapus selama berstatus diajukan');
  }
}

function list(user, filters) {
  // Admin melihat semua; mahasiswa dibatasi pada data miliknya sendiri di level query.
  return isAdmin(user) ? repo.findAll(filters) : repo.findByOwner(user.id, filters);
}

function getById(user, id) {
  const item = getExisting(id);
  if (!isAdmin(user) && item.mahasiswaId !== user.id) {
    throw new AppError(403, 'Anda tidak berhak mengakses pengaduan ini');
  }
  return item;
}

function create(user, input) {
  // Pemilik, id, status awal, dan waktu ditentukan server, bukan client.
  return repo.create({
    mahasiswaId: user.id,
    judul: input.judul,
    kategori: input.kategori,
    deskripsi: input.deskripsi,
    status: 'diajukan',
    createdAt: new Date().toISOString(),
  });
}

function update(user, id, input) {
  const item = getExisting(id);
  assertOwnerAndEditable(user, item);
  return repo.update(id, {
    judul: input.judul,
    kategori: input.kategori,
    deskripsi: input.deskripsi,
  });
}

function updateStatus(id, status) {
  getExisting(id);
  return repo.update(id, { status });
}

function remove(user, id) {
  const item = getExisting(id);
  assertOwnerAndEditable(user, item);
  repo.remove(id);
}

module.exports = { list, getById, create, update, updateStatus, remove };
