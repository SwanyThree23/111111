import winston from 'winston';

const redactSecrets = winston.format((info) => {
  const SECRET_PATTERNS = [
    /live_[a-f0-9]{32}/gi,
    /rtmp:\/\/[^\s]+(\/[a-z0-9_-]+){1,2}/gi,
    /refresh_token=[^;\s]+/gi,
    /Authorization: Bearer [^;\s]+/gi,
  ];

  let str = JSON.stringify(info);
  SECRET_PATTERNS.forEach((pattern) => {
    str = str.replace(pattern, '[REDACTED]');
  });
  return JSON.parse(str);
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    redactSecrets(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'development'
        ? winston.format.combine(winston.format.colorize(), winston.format.simple())
        : winston.format.json(),
    }),
  ],
});

export default logger;
