'use strict';

const config = require('./src/config.cjs');
const { createApp } = require('./app.cjs');

const app = createApp();

app.listen(config.port, () => {
  console.log(`SIMADU API berjalan di http://localhost:${config.port}`);
  console.log(`Swagger UI           di http://localhost:${config.port}/api-docs`);
});
