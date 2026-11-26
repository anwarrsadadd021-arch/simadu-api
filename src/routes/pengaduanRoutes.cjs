'use strict';

const express = require('express');
const authenticate = require('../middleware/authenticate.cjs');
const { requireRole } = require('../middleware/authorize.cjs');
const {
  validateId,
  validatePengaduanBody,
  validateStatusBody,
  validateListQuery,
} = require('../middleware/validate.cjs');
const controller = require('../controllers/pengaduanController.cjs');

const router = express.Router();

// Semua endpoint pengaduan wajib terautentikasi.
router.use(authenticate);

// Urutan middleware: authenticate -> requireRole (otorisasi role) -> validasi -> controller.
// Otorisasi kepemilikan (level objek) dilakukan di service.
router.get('/', validateListQuery, controller.list);
router.get('/:id', validateId, controller.getById);
router.post('/', requireRole('mahasiswa'), validatePengaduanBody, controller.create);
router.put('/:id', requireRole('mahasiswa'), validateId, validatePengaduanBody, controller.update);
router.patch('/:id/status', requireRole('admin'), validateId, validateStatusBody, controller.updateStatus);
router.delete('/:id', requireRole('mahasiswa'), validateId, controller.remove);

module.exports = router;
