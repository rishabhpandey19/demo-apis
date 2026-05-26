const { createLogger, format, transports } = require('winston');
const { combine, timestamp, json, colorize, printf } = format;
const path = require('path');

const logDir = path.join(__dirname, '../../logs');

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(timestamp(), json()),
  transports: [
    new transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
    new transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: combine(
      colorize(),
      printf(({ level, message, timestamp, ...meta }) =>
        `${timestamp} [${level}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`
      )
    ),
  }));
} else {
  logger.add(new transports.Console({ format: combine(timestamp(), json()) }));
}

module.exports = logger;
