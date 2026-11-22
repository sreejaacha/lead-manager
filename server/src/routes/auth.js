const express = require('express');
const bcrypt = require('bcryptjs');
const { validateSignup } = require('../validation');
const { signToken, requireAuth } = require('../middleware');

module.exports = (db) => {
  const router = express.Router();

  router.post('/signup', (req, res) => {
    const { errors, value } = validateSignup(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ error: 'Validation failed', details: errors });

    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(value.email)) {
      return res.status(409).json({ error: 'Validation failed', details: { email: 'This email is already registered' } });
    }
    const hash = bcrypt.hashSync(value.password, 10);
    const { lastInsertRowid } = db
      .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
      .run(value.name, value.email, hash);
    const user = { id: Number(lastInsertRowid), name: value.name, email: value.email };
    res.status(201).json({ token: signToken(user), user });
  });

  router.post('/login', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!row || !bcrypt.compareSync(password, row.password_hash)) {
      return res.status(401).json({ error: 'Incorrect email or password' });
    }
    const user = { id: row.id, name: row.name, email: row.email };
    res.json({ token: signToken(user), user });
  });

  router.get('/me', requireAuth, (req, res) => {
    const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.userId);
    if (!user) return res.status(401).json({ error: 'User no longer exists' });
    res.json({ user });
  });

  return router;
};
