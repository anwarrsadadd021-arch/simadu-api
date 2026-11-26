'use strict';

const express = require('express');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const config = require('./src/config.cjs');
const openapiDocument = require('./docs/openapi.json');
const routes = require('./src/routes/index.cjs');
const requestLogger = require('./src/middleware/requestLogger.cjs');
const { notFound, errorHandler } = require('./src/middleware/errorHandler.cjs');
const { sendSuccess } = require('./src/utils/response.cjs');

/**
 * Membangun aplikasi Express. `extend` (opsional) dipakai pengujian untuk
 * menambah rute khusus uji sebelum notFound/errorHandler dipasang.
 */
function createApp({ extend } = {}) {
  const app = express();

  // Swagger UI memakai skrip inline, jadi dipasang sebelum helmet (CSP ketat) dan hanya untuk /api-docs.
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiDocument, { customSiteTitle: 'SIMADU API Docs' }));

  app.use(helmet());
  if (config.env !== 'test') app.use(requestLogger);
  app.use(express.json({ limit: '10kb' }));

  app.get('/health', (_req, res) => sendSuccess(res, 200, 'SIMADU API berjalan'));
  app.use('/api', routes);

  if (typeof extend === 'function') extend(app);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
