'use strict';

/**
 * Pengujian fungsional & keamanan SIMADU API.
 * Menjalankan server sungguhan di port acak, mengirim permintaan HTTP nyata, lalu
 * mencatat respons aktual ke tests/results.json (dipakai sebagai bukti di laporan).
 *
 * Jalankan: npm test
 * Skenario 1-12 sama dengan tabel pada soal UTS; skenario 13+ adalah pengujian tambahan.
 */

// Konfigurasi khusus pengujian (diatur sebelum modul aplikasi dimuat).
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me-0123456789abcdef';
process.env.LOGIN_RATE_LIMIT_MAX = '1000';

const fs = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const { createApp } = require('../app.cjs');

const app = createApp({
  extend(a) {
    // Rute khusus uji untuk memicu error tak terduga (membuktikan 500 tidak membocorkan detail).
    a.get('/__test/boom', () => {
      throw new Error('koneksi db gagal password=RAHASIA123 di /srv/internal/app.js');
    });
  },
});

const results = [];
let baseUrl;

const mask = (token) => (token ? `${token.slice(0, 20)}...(dipotong)` : null);

async function http({ method = 'GET', url, token, body, rawBody, contentType }) {
  const headers = {};
  if (token !== undefined) headers.Authorization = token === null ? undefined : `Bearer ${token}`;
  let payload;
  if (rawBody !== undefined) {
    payload = rawBody;
    headers['Content-Type'] = contentType || 'application/json';
  } else if (body !== undefined) {
    payload = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(baseUrl + url, { method, headers, body: payload });
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed };
}

async function login(username, password) {
  const r = await http({ method: 'POST', url: '/api/auth/login', body: { username, password } });
  return r.body.data && r.body.data.token;
}

/** Snapshot seluruh data (via admin) untuk membuktikan permintaan yang ditolak tidak mengubah data. */
let adminToken;
async function snapshot() {
  const r = await http({ url: '/api/pengaduan', token: adminToken });
  return JSON.stringify(r.body.data);
}

let counter = 0;
async function scenario({ name, expected, run, check, checkUnchanged = false, extraNote }) {
  counter += 1;
  const before = checkUnchanged ? await snapshot() : null;
  const { request, response } = await run();
  const after = checkUnchanged ? await snapshot() : null;

  const statusOk = response.status === expected;
  const extraOk = check ? Boolean(check(response)) : true;
  const unchangedOk = checkUnchanged ? before === after : true;
  const pass = statusOk && extraOk && unchangedOk;

  results.push({
    no: counter,
    name,
    expected,
    actual: response.status,
    pass,
    request,
    response: response.body,
    dataUnchanged: checkUnchanged ? unchangedOk : null,
    note: extraNote || null,
  });
  const mark = pass ? 'LULUS' : 'GAGAL';
  console.log(
    `${String(counter).padStart(2)}. [${mark}] ${name} -> diharapkan ${expected}, aktual ${response.status}` +
      (checkUnchanged ? `, data tidak berubah: ${unchangedOk}` : '')
  );
}

/** Pembungkus: kirim request dan catat bentuk request yang ditampilkan di laporan. */
async function send(opts, display = {}) {
  const response = await http(opts);
  const request = {
    method: opts.method || 'GET',
    url: opts.url,
    auth: display.auth !== undefined ? display.auth : opts.token ? `Bearer ${mask(opts.token)}` : '(tanpa header Authorization)',
    body: display.body !== undefined ? display.body : opts.body !== undefined ? opts.body : opts.rawBody !== undefined ? opts.rawBody : null,
  };
  return { request, response };
}

async function main() {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const budi = await login('budi', 'Budi#2026');
  const siti = await login('siti', 'Siti#2026');
  adminToken = await login('admin', 'Admin#2026');
  if (!budi || !siti || !adminToken) throw new Error('Login awal gagal; pengujian dibatalkan.');

  const validBody = {
    judul: 'AC ruang kelas C101 mati',
    kategori: 'Fasilitas',
    deskripsi: 'AC di ruang C101 tidak dingin sehingga ruangan terasa sangat panas.',
  };
  let budiNewId;

  // ---------- Skenario wajib 1-12 ----------
  await scenario({
    name: 'Login dengan kredensial benar',
    expected: 200,
    check: (r) => typeof r.body.data.token === 'string' && r.body.data.tokenType === 'Bearer',
    run: async () => {
      const out = await send({ method: 'POST', url: '/api/auth/login', body: { username: 'budi', password: 'Budi#2026' } });
      if (out.response.body.data) out.response.body.data.token = mask(out.response.body.data.token);
      return out;
    },
  });

  await scenario({
    name: 'Login dengan password salah',
    expected: 401,
    run: () => send({ method: 'POST', url: '/api/auth/login', body: { username: 'budi', password: 'salah-total' } }),
  });

  await scenario({
    name: 'Akses endpoint terlindungi tanpa token',
    expected: 401,
    run: () => send({ url: '/api/pengaduan' }),
  });

  await scenario({
    name: 'Akses menggunakan token tidak valid',
    expected: 401,
    run: () => send({ url: '/api/pengaduan', token: 'abc.def.ghi' }, { auth: 'Bearer abc.def.ghi' }),
  });

  await scenario({
    name: 'Mahasiswa membuat pengaduan valid',
    expected: 201,
    check: (r) => {
      budiNewId = r.body.data.id;
      return r.body.data.mahasiswaId === 'M2024001' && r.body.data.status === 'diajukan' && !Number.isNaN(Date.parse(r.body.data.createdAt));
    },
    run: () => send({ method: 'POST', url: '/api/pengaduan', token: budi, body: validBody }),
  });

  await scenario({
    name: 'Mahasiswa membaca pengaduan sendiri',
    expected: 200,
    check: (r) => r.body.data.mahasiswaId === 'M2024001',
    run: () => send({ url: '/api/pengaduan/1', token: budi }),
  });

  await scenario({
    name: 'Mahasiswa mencoba membaca pengaduan orang lain',
    expected: 403,
    run: () => send({ url: '/api/pengaduan/2', token: budi }),
  });

  await scenario({
    name: 'Mahasiswa mengubah status pengaduan',
    expected: 403,
    checkUnchanged: true,
    run: () => send({ method: 'PATCH', url: '/api/pengaduan/1/status', token: budi, body: { status: 'selesai' } }),
  });

  await scenario({
    name: 'Admin melihat seluruh pengaduan',
    expected: 200,
    check: (r) => new Set(r.body.data.map((p) => p.mahasiswaId)).size >= 2,
    run: () => send({ url: '/api/pengaduan', token: adminToken }),
  });

  await scenario({
    name: 'Admin memperbarui status pengaduan',
    expected: 200,
    check: (r) => r.body.data.status === 'diproses' && r.body.data.mahasiswaId === 'M2024001',
    run: () => send({ method: 'PATCH', url: `/api/pengaduan/${budiNewId}/status`, token: adminToken, body: { status: 'diproses' } }),
  });

  await scenario({
    name: 'Membuat pengaduan dengan field wajib kosong',
    expected: 400,
    checkUnchanged: true,
    check: (r) => r.body.errors.some((e) => e.field === 'judul'),
    run: () => send({ method: 'POST', url: '/api/pengaduan', token: budi, body: { judul: '', kategori: 'Fasilitas', deskripsi: '' } }),
  });

  await scenario({
    name: 'Mengakses ID pengaduan yang tidak ditemukan',
    expected: 404,
    run: () => send({ url: '/api/pengaduan/9999', token: budi }),
  });

  // ---------- Skenario tambahan ----------
  const secret = process.env.JWT_SECRET;

  await scenario({
    name: 'Token kedaluwarsa ditolak',
    expected: 401,
    check: (r) => /kedaluwarsa/i.test(r.body.message),
    run: () => {
      const expired = jwt.sign({ role: 'admin' }, secret, { subject: 'A001', issuer: 'simadu-api', expiresIn: -60 });
      return send({ url: '/api/pengaduan', token: expired }, { auth: `Bearer ${mask(expired)} (exp sudah lewat)` });
    },
  });

  await scenario({
    name: 'Token dengan tanda tangan palsu ditolak',
    expected: 401,
    run: () => {
      const forged = jwt.sign({ role: 'admin' }, 'secret-milik-penyerang-yang-panjang-sekali-0000', { subject: 'A001', issuer: 'simadu-api', expiresIn: '15m' });
      return send({ url: '/api/pengaduan', token: forged }, { auth: `Bearer ${mask(forged)} (ditandatangani kunci lain)` });
    },
  });

  await scenario({
    name: 'Mahasiswa hanya melihat daftar pengaduannya sendiri',
    expected: 200,
    check: (r) => r.body.data.length > 0 && r.body.data.every((p) => p.mahasiswaId === 'M2024001'),
    run: () => send({ url: '/api/pengaduan', token: budi }),
  });

  await scenario({
    name: 'Mass assignment (id, mahasiswaId, status dari client) ditolak',
    expected: 400,
    checkUnchanged: true,
    check: (r) => ['id', 'mahasiswaId', 'status'].every((f) => r.body.errors.some((e) => e.field === f)),
    run: () =>
      send({ method: 'POST', url: '/api/pengaduan', token: budi, body: { ...validBody, id: 1, mahasiswaId: 'M2024002', status: 'selesai' } }),
  });

  await scenario({
    name: 'Admin tidak boleh membuat pengaduan',
    expected: 403,
    checkUnchanged: true,
    run: () => send({ method: 'POST', url: '/api/pengaduan', token: adminToken, body: validBody }),
  });

  await scenario({
    name: 'Admin tidak boleh mengubah isi pengaduan (PUT)',
    expected: 403,
    checkUnchanged: true,
    run: () => send({ method: 'PUT', url: '/api/pengaduan/1', token: adminToken, body: validBody }),
  });

  await scenario({
    name: 'Mahasiswa mengubah pengaduan milik orang lain',
    expected: 403,
    checkUnchanged: true,
    run: () => send({ method: 'PUT', url: '/api/pengaduan/2', token: budi, body: validBody }),
  });

  await scenario({
    name: 'Mahasiswa mengubah pengaduan sendiri (status diajukan)',
    expected: 200,
    check: (r) => r.body.data.id === 1 && r.body.data.mahasiswaId === 'M2024001' && r.body.data.judul === validBody.judul,
    run: () => send({ method: 'PUT', url: '/api/pengaduan/1', token: budi, body: validBody }),
  });

  await scenario({
    name: 'Mahasiswa mengubah pengaduan yang sudah diproses',
    expected: 409,
    checkUnchanged: true,
    run: () => send({ method: 'PUT', url: `/api/pengaduan/${budiNewId}`, token: budi, body: validBody }),
  });

  await scenario({
    name: 'Mahasiswa menghapus pengaduan milik orang lain',
    expected: 403,
    checkUnchanged: true,
    run: () => send({ method: 'DELETE', url: '/api/pengaduan/2', token: budi }),
  });

  await scenario({
    name: 'Mahasiswa menghapus pengaduan yang sudah diproses',
    expected: 409,
    checkUnchanged: true,
    run: () => send({ method: 'DELETE', url: '/api/pengaduan/3', token: budi }),
  });

  await scenario({
    name: 'Admin tidak boleh menghapus pengaduan',
    expected: 403,
    checkUnchanged: true,
    run: () => send({ method: 'DELETE', url: '/api/pengaduan/2', token: adminToken }),
  });

  let tempId;
  await scenario({
    name: 'Mahasiswa menghapus pengaduan sendiri (status diajukan)',
    expected: 200,
    run: async () => {
      const created = await http({ method: 'POST', url: '/api/pengaduan', token: budi, body: { ...validBody, judul: 'Pengaduan sementara' } });
      tempId = created.body.data.id;
      return send({ method: 'DELETE', url: `/api/pengaduan/${tempId}`, token: budi });
    },
  });

  await scenario({
    name: 'Pengaduan yang sudah dihapus tidak dapat diakses lagi',
    expected: 404,
    run: () => send({ url: `/api/pengaduan/${tempId}`, token: budi }),
  });

  await scenario({
    name: 'Admin memberi status tidak valid',
    expected: 400,
    checkUnchanged: true,
    run: () => send({ method: 'PATCH', url: '/api/pengaduan/2/status', token: adminToken, body: { status: 'dibatalkan' } }),
  });

  await scenario({
    name: 'Admin mengirim field tambahan pada PATCH status',
    expected: 400,
    checkUnchanged: true,
    run: () => send({ method: 'PATCH', url: '/api/pengaduan/2/status', token: adminToken, body: { status: 'diproses', mahasiswaId: 'A001' } }),
  });

  await scenario({
    name: 'Body JSON rusak (format salah)',
    expected: 400,
    checkUnchanged: true,
    run: () => send({ method: 'POST', url: '/api/pengaduan', token: budi, rawBody: '{"judul": "tanpa penutup"' }),
  });

  await scenario({
    name: 'Parameter ID bukan angka',
    expected: 400,
    run: () => send({ url: '/api/pengaduan/abc', token: budi }),
  });

  await scenario({
    name: 'Login tanpa field password',
    expected: 400,
    run: () => send({ method: 'POST', url: '/api/auth/login', body: { username: 'budi' } }),
  });

  await scenario({
    name: 'Endpoint tidak dikenal',
    expected: 404,
    run: () => send({ url: '/api/tidak-ada', token: budi }),
  });

  await scenario({
    name: 'Error tak terduga menghasilkan 500 tanpa membocorkan detail',
    expected: 500,
    check: (r) => {
      const s = JSON.stringify(r.body);
      return !s.includes('RAHASIA123') && !s.includes('/srv/internal') && !s.includes('at ');
    },
    run: () => send({ url: '/__test/boom' }),
  });

  server.close();

  const passed = results.filter((r) => r.pass).length;
  const outFile = path.join(__dirname, 'results.json');
  fs.writeFileSync(
    outFile,
    JSON.stringify({ generatedAt: new Date().toISOString(), total: results.length, passed, results }, null, 2)
  );
  console.log(`\nRingkasan: ${passed}/${results.length} skenario lulus. Bukti respons: tests/results.json`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((err) => {
  console.error('Pengujian berhenti karena error:', err);
  process.exit(2);
});
