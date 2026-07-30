const app = require('./app');
const {
  APP_NAME,
  PORT,
} = require('./common/config/env');

const server = app.listen(PORT, () => {
  console.log(`${APP_NAME} listening on port ${PORT}`);
});

module.exports = server;
