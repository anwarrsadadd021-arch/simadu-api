# SIMADU API

REST API **Sistem Layanan Informasi dan Pengaduan Mahasiswa** — UTS Web Service Engineering.
Dibangun dengan Node.js, Express 5, dan JSON; arsitektur berlapis; autentikasi Bearer token (JWT); dokumentasi OpenAPI + Swagger UI.

## Prasyarat

- Node.js **>= 20.12** (diuji pada Node 22)
- npm
- (Opsional) Postman atau VS Code REST Client untuk pengujian manual

## Instalasi

```bash
npm install
cp .env.example .env     # Windows PowerShell: Copy-Item .env.example .env
```

## Konfigurasi (`.env`)

| Variabel | Wajib | Default | Keterangan |
|---|---|---|---|
| `JWT_SECRET` | ya | – | Kunci penandatangan token, minimal 32 karakter |
| `PORT` | tidak | `3000` | Port server |
| `JWT_EXPIRES_IN` | tidak | `15m` | Masa berlaku token |
| `BCRYPT_ROUNDS` | tidak | `10` | Biaya hashing password |
| `LOGIN_RATE_LIMIT_MAX` | tidak | `10` | Maks. percobaan login per IP per 15 menit |

Buat `JWT_SECRET` acak:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Server menolak berjalan bila `JWT_SECRET` kosong atau terlalu pendek.

## Menjalankan

```bash
npm start        # http://localhost:3000
npm run dev      # mode watch (restart otomatis)
npm test         # jalankan 33 skenario uji + simpan bukti ke tests/results.json
```

- Swagger UI: <http://localhost:3000/api-docs>
- Kontrak OpenAPI: [`docs/openapi.json`](docs/openapi.json)
- Health check: `GET /health`

## Akun uji

Data awal berada di memori dan kembali ke kondisi awal setiap server dimulai ulang.

| Username | Password | Role | ID |
|---|---|---|---|
| `budi` | `Budi#2026` | mahasiswa | `M2024001` |
| `siti` | `Siti#2026` | mahasiswa | `M2024002` |
| `admin` | `Admin#2026` | admin | `A001` |

Password hanya ada di kode sebagai data uji untuk di-hash saat start; yang tersimpan di memori adalah hash bcrypt.

Data pengaduan awal: #1 (milik Budi, `diajukan`), #2 (milik Siti, `diajukan`), #3 (milik Budi, `diproses`).

## Endpoint

| Metode | Endpoint | Fungsi | Akses |
|---|---|---|---|
| POST | `/api/auth/login` | Login, menerima Bearer token | publik |
| GET | `/api/pengaduan` | Daftar pengaduan (filter opsional `?status=&kategori=`) | mahasiswa (milik sendiri), admin (semua) |
| GET | `/api/pengaduan/:id` | Detail pengaduan | mahasiswa pemilik, admin |
| POST | `/api/pengaduan` | Membuat pengaduan | mahasiswa |
| PUT | `/api/pengaduan/:id` | Mengubah judul, kategori, deskripsi | mahasiswa pemilik, status `diajukan` |
| PATCH | `/api/pengaduan/:id/status` | Memperbarui status | admin |
| DELETE | `/api/pengaduan/:id` | Menghapus pengaduan | mahasiswa pemilik, status `diajukan` |

### Contoh cepat

```bash
# 1) Login
curl -s -X POST localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"budi","password":"Budi#2026"}'

# 2) Pakai token dari data.token
curl -s localhost:3000/api/pengaduan -H "Authorization: Bearer <TOKEN>"

# 3) Buat pengaduan
curl -s -X POST localhost:3000/api/pengaduan \
  -H "Authorization: Bearer <TOKEN>" -H 'Content-Type: application/json' \
  -d '{"judul":"AC ruang C101 mati","kategori":"Fasilitas","deskripsi":"AC di ruang C101 tidak dingin sama sekali."}'
```

### Format respons

```json
{ "success": true,  "message": "Pengaduan berhasil dibuat", "data": { "id": 4, "mahasiswaId": "M2024001", "judul": "...", "kategori": "Fasilitas", "deskripsi": "...", "status": "diajukan", "createdAt": "2026-11-23T02:10:00.000Z" } }
{ "success": false, "message": "Validasi gagal", "errors": [ { "field": "judul", "message": "Field tidak boleh kosong" } ] }
```

### Kode status

| Kode | Arti di API ini |
|---|---|
| 200 / 201 | Berhasil / berhasil dibuat |
| 400 | Validasi gagal: field wajib kosong, field tidak diperbolehkan, tipe salah, JSON rusak, ID bukan angka |
| 401 | Token tidak ada / tidak valid / kedaluwarsa, atau login gagal |
| 403 | Terautentikasi tetapi tidak berhak (role salah atau bukan pemilik data) |
| 404 | Pengaduan atau endpoint tidak ditemukan |
| 409 | Mahasiswa mengubah/menghapus pengaduan yang sudah tidak berstatus `diajukan` |
| 429 | Terlalu banyak percobaan login |
| 500 | Kesalahan server (pesan generik, tanpa detail internal) |

## Matriks hak akses

| Operasi | Mahasiswa | Admin |
|---|:---:|:---:|
| Melihat pengaduan sendiri | ✓ | ✓ |
| Melihat semua pengaduan | × | ✓ |
| Membuat pengaduan | ✓ | × |
| Mengubah pengaduan sendiri (status `diajukan`) | ✓ | × |
| Menghapus pengaduan sendiri (status `diajukan`) | ✓ | × |
| Mengubah status pengaduan | × | ✓ |

## Arsitektur dan tanggung jawab lapisan

```
Client -> app.cjs -> routes -> middleware (authenticate, requireRole, validate) -> controller -> service -> repository -> data
                                                                   \-> errorHandler (semua error berakhir di sini)
```

| Lapisan | Folder | Tanggung jawab |
|---|---|---|
| Router | `src/routes` | Memetakan metode + path ke rantai middleware dan controller |
| Middleware | `src/middleware` | `authenticate` (verifikasi token), `authorize` (cek role), `validate` (validasi input & tolak field asing), `errorHandler` (format error seragam, 500 tanpa bocor), `requestLogger` (log tanpa token) |
| Controller | `src/controllers` | Menerima input tervalidasi, memanggil service, membentuk respons HTTP |
| Service | `src/services` | Aturan bisnis: kepemilikan data, aturan status `diajukan`, penerbitan token |
| Repository | `src/repositories` | Akses data (array di memori); tanpa aturan bisnis |

Pengaduan menyimpan `mahasiswaId`, `id`, `status` awal, dan `createdAt` yang ditentukan **server**; client tidak dapat menentukannya (field tersebut ditolak 400).

## Keamanan yang diterapkan

- Password disimpan sebagai hash **bcrypt**; pesan login gagal sama untuk username salah dan password salah, dengan waktu pembanding yang disamakan.
- **JWT (HS256)** dengan `sub`, `role`, `jti` unik, issuer, dan kedaluwarsa; algoritma dikunci saat verifikasi (menolak `alg: none`).
- Otorisasi dua tingkat: role (middleware) dan kepemilikan data (service).
- Validasi daftar putih: field tak dikenal ditolak; ID harus bilangan bulat positif; body dibatasi 10 KB.
- Error handler terpusat: 500 tidak membocorkan stack/pesan internal; token dan password tidak pernah dicatat ke log.
- `helmet` untuk header keamanan, pembatasan percobaan login (`express-rate-limit`).

## Pengujian

`npm test` memulai server pada port acak, mengirim 33 permintaan HTTP nyata (12 skenario wajib soal + 21 tambahan, termasuk token kedaluwarsa, token palsu, mass assignment, dan bukti bahwa permintaan yang ditolak tidak mengubah data), lalu menulis respons aktual ke `tests/results.json`. File `tests/simadu.http` berisi 12 skenario wajib untuk dijalankan manual.

## Struktur proyek

```
simadu-api/
├── src/{controllers,services,repositories,routes,middleware,utils}
├── docs/openapi.json
├── tests/{run-scenarios.cjs, simadu.http, results.json}
├── app.cjs  server.cjs  package.json  .env.example  .gitignore  README.md
```

## Catatan menuju production

Penyimpanan masih di memori; belum ada HTTPS/TLS; belum ada refresh token / pencabutan token; kunci JWT dari environment. Lihat jawaban pertanyaan 10 pada laporan.
