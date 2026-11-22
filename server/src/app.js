const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { notFound, errorHandler } = require('./middleware');

function createApp(db) {
  const app = express();
  app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.use('/api/auth', require('./routes/auth')(db));
  app.use('/api/leads', require('./routes/leads')(db));
  app.use('/api', notFound);

  // In production, serve the built React app from the same server (single deploy).
  const dist = path.join(__dirname, '../../client/dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
