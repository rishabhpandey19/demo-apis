const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app    = express();
const PORT   = process.env.PORT || 3000;
const logger = require('./logger');
const store  = require('./store');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

app.use('/api/logs',  require('./routes/logs'));
app.use('/api/query', require('./routes/query'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: Math.round(process.uptime()), ts: new Date().toISOString(), store: { size: store.size(), max: 10_000 } });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.listen(PORT, () => {
  logger.info('LogForge started', { port: PORT, env: process.env.NODE_ENV || 'development' });
  console.log(`LogForge running → http://localhost:${PORT}`);
});
