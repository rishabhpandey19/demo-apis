const { v4: uuidv4 } = require('uuid');

module.exports = {
  server_error: (logger) => {
    const meta = {
      requestId: uuidv4(), path: '/api/products', method: 'GET',
      statusCode: 500,
      error: 'TypeError: Cannot read properties of undefined',
      stack: 'at ProductController.list (/app/controllers/product.js:42:18)',
    };
    logger.error('Unhandled exception in request handler', meta);
    return meta;
  },

  db_down: (logger) => {
    const meta = {
      requestId: uuidv4(), host: 'db.internal', port: 5432,
      attempt: 3, maxAttempts: 3, error: 'ECONNREFUSED', timeoutMs: 5000,
    };
    logger.error('Database connection failed — all retries exhausted', meta);
    return meta;
  },

  auth_error: (logger) => {
    const meta = {
      requestId: uuidv4(), ip: '203.0.113.42',
      reason: 'TokenExpiredError', path: '/api/user/profile', method: 'GET',
    };
    logger.error('Authentication failed — invalid or expired JWT', meta);
    return meta;
  },

  user_blocked: (logger) => {
    const meta = {
      requestId: uuidv4(), userId: `usr_${uuidv4().slice(0, 8)}`,
      reason: 'FRAUD_SUSPECTED', path: '/api/orders', ip: '198.51.100.7',
    };
    logger.warn('Blocked user attempted resource access', meta);
    return meta;
  },

  rate_limit: (logger) => {
    const meta = {
      requestId: uuidv4(), ip: '198.51.100.7',
      limit: 100, current: 147, window: '60s', action: 'THROTTLE',
    };
    logger.warn('Rate limit exceeded — request throttled', meta);
    return meta;
  },

  payment_fail: (logger) => {
    const meta = {
      requestId: uuidv4(), orderId: `ord_${uuidv4().slice(0, 8)}`,
      gateway: 'stripe', code: 'card_declined', amount: '$249.00', currency: 'USD',
    };
    logger.error('Payment processing declined by gateway', meta);
    return meta;
  },

  cache_miss: (logger) => {
    const meta = {
      requestId: uuidv4(), key: 'product:catalog:page=2',
      ttl: 300, dbFallback: true, cacheProvider: 'Redis',
    };
    logger.warn('Cache miss — falling back to database query', meta);
    return meta;
  },

  slow_query: (logger) => {
    const meta = {
      requestId: uuidv4(), durationMs: 3842,
      query: 'SELECT * FROM orders WHERE status=? AND created_at > ?',
      rows: 12049, thresholdMs: 1000,
    };
    logger.warn('Slow database query detected', meta);
    return meta;
  },

  third_party_down: (logger) => {
    const meta = {
      requestId: uuidv4(), service: 'SendGrid',
      endpoint: '/v3/mail/send', timeoutMs: 10000,
      status: 'ETIMEDOUT', retries: 3,
    };
    logger.error('External API unreachable — request failed', meta);
    return meta;
  },

  disk_full: (logger) => {
    const meta = {
      requestId: uuidv4(), mount: '/var/data',
      usedPercent: 94, freeGb: 2.1, thresholdPercent: 90, alertSent: true,
    };
    logger.error('CRITICAL: Disk usage exceeds threshold — writes may fail', meta);
    return meta;
  },

  service_start: (logger) => {
    const meta = {
      version: '2.4.1', env: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 3000, workers: 4, nodeVersion: process.version,
    };
    logger.info('Service started successfully', meta);
    return meta;
  },

  user_login: (logger) => {
    const meta = {
      userId: `usr_${uuidv4().slice(0, 8)}`, method: 'OAuth2',
      provider: 'google', ip: '192.168.1.50', sessionId: uuidv4(),
    };
    logger.info('User authenticated successfully', meta);
    return meta;
  },
};
