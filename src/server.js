const app = require('./app');
const {
  APP_NAME,
  PORT,
} = require('./common/config/env');
const logger = require('./common/logging/logger');

const server = app.listen(PORT, () => {
  logger.info('Server', { message: `${APP_NAME} listening on port ${PORT}` });
});

module.exports = server;
