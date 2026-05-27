const express   = require('express');
const cors      = require('cors');
const path      = require('path');
const fs        = require('fs');
const yaml      = require('js-yaml');
const swaggerUi = require('swagger-ui-express');

const app    = express();
const PORT   = process.env.PORT || 3000;
const logger = require('./logger');
const store  = require('./store');

// Load OpenAPI spec
const specPath = path.join(__dirname, '../openapi.yaml');
const apiSpec  = yaml.load(fs.readFileSync(specPath, 'utf8'));

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// Swagger UI at /docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(apiSpec, {
  customSiteTitle: 'LogForge API Docs',
  customCss: '.swagger-ui .topbar { background: #0f172a } .swagger-ui .topbar-wrapper img { display:none }',
}));

// Raw spec download
app.get('/openapi.yaml', (_req, res) => {
  res.setHeader('Content-Type', 'application/yaml');
  res.sendFile(specPath);
});
app.get('/openapi.json', (_req, res) => res.json(apiSpec));

app.use('/api/logs',  require('./routes/logs'));
app.use('/api/query', require('./routes/query'));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    ts:     new Date().toISOString(),
    store:  { size: store.size(), max: 10_000 },
  });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.listen(PORT, () => {
  logger.info('LogForge started', { port: PORT, env: process.env.NODE_ENV || 'development' });
  console.log(`LogForge running  → http://localhost:${PORT}`);
  console.log(`API docs          → http://localhost:${PORT}/docs`);
  console.log(`OpenAPI spec      → http://localhost:${PORT}/openapi.yaml`);
});
