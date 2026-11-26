'use strict';

/**
 * Penyimpanan pengaduan (array dalam memori). Repository hanya mengurus akses data;
 * tidak ada aturan bisnis atau pemeriksaan hak akses di sini.
 * Semua nilai yang keluar adalah salinan agar pemanggil tidak bisa memodifikasi data asli.
 */
const items = [
  {
    id: 1,
    mahasiswaId: 'M2024001',
    judul: 'Proyektor ruang B204 rusak',
    kategori: 'Fasilitas',
    deskripsi: 'Proyektor di ruang B204 tidak menyala sejak awal minggu ini sehingga perkuliahan terganggu.',
    status: 'diajukan',
    createdAt: '2026-11-02T01:15:00.000Z',
  },
  {
    id: 2,
    mahasiswaId: 'M2024002',
    judul: 'KRS tidak dapat diakses',
    kategori: 'Akademik',
    deskripsi: 'Halaman KRS menampilkan error saat dibuka sehingga saya tidak bisa mengisi mata kuliah.',
    status: 'diajukan',
    createdAt: '2026-11-03T03:30:00.000Z',
  },
  {
    id: 3,
    mahasiswaId: 'M2024001',
    judul: 'WiFi kampus sangat lambat',
    kategori: 'TI',
    deskripsi: 'Koneksi WiFi di gedung perpustakaan sangat lambat pada jam sibuk sehingga sulit mengunduh materi.',
    status: 'diproses',
    createdAt: '2026-11-04T07:45:00.000Z',
  },
];

let nextId = items.length + 1;

const copy = (item) => (item ? { ...item } : null);

function matches(item, filters) {
  if (filters.status && item.status !== filters.status) return false;
  if (filters.kategori && item.kategori !== filters.kategori) return false;
  return true;
}

function findAll(filters = {}) {
  return items.filter((i) => matches(i, filters)).map(copy);
}

function findByOwner(mahasiswaId, filters = {}) {
  return items.filter((i) => i.mahasiswaId === mahasiswaId && matches(i, filters)).map(copy);
}

function findById(id) {
  return copy(items.find((i) => i.id === id));
}

function create(data) {
  const item = { id: nextId++, ...data };
  items.push(item);
  return copy(item);
}

function update(id, changes) {
  const item = items.find((i) => i.id === id);
  if (!item) return null;
  Object.assign(item, changes);
  return copy(item);
}

function remove(id) {
  const index = items.findIndex((i) => i.id === id);
  if (index === -1) return false;
  items.splice(index, 1);
  return true;
}

module.exports = { findAll, findByOwner, findById, create, update, remove };
