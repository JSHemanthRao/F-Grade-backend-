const { DEBUG_ASSISTANT } = require('../config/env');

function write(level, scope, details) {
  if (!DEBUG_ASSISTANT) return;
  let serialized = '';
  if (details !== undefined) {
    try {
      serialized = ` ${JSON.stringify(details)}`;
    } catch {
      serialized = ` ${String(details)}`;
    }
  }
  process.stderr.write(`[${scope}] ${level}${serialized}\n`);
}

module.exports = {
  debug: (scope, details) => write('debug', scope, details),
  info: (scope, details) => write('info', scope, details),
  warn: (scope, details) => write('warn', scope, details),
  error: (scope, details) => write('error', scope, details),
};
