'use strict';

const express = require('express');
const authRoutes = require('./authRoutes.cjs');
const pengaduanRoutes = require('./pengaduanRoutes.cjs');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/pengaduan', pengaduanRoutes);

module.exports = router;
