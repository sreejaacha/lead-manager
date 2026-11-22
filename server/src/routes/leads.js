const express = require('express');
const { STATUSES, SOURCES, validateLead } = require('../validation');
const { requireAuth } = require('../middleware');

// Whitelist for ORDER BY — never interpolate user input directly into SQL.
const SORTABLE = { name: 'name', company: 'company', status: 'status', created: 'created_at', updated: 'updated_at' };

module.exports = (db) => {
  const router = express.Router();
  router.use(requireAuth);

  const findOwn = (id, userId) => db.prepare('SELECT * FROM leads WHERE id = ? AND user_id = ?').get(id, userId);
  const parseId = (raw) => (/^\d+$/.test(raw) ? Number(raw) : null);

  // Meta used by the frontend dropdowns (single source of truth lives on the server)
  router.get('/meta', (req, res) => res.json({ statuses: STATUSES, sources: SOURCES }));

  // Dashboard: count per status
  router.get('/stats', (req, res) => {
    const rows = db.prepare('SELECT status, COUNT(*) AS count FROM leads WHERE user_id = ? GROUP BY status').all(req.userId);
    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    rows.forEach((r) => (counts[r.status] = r.count));
    res.json({ total: Object.values(counts).reduce((a, b) => a + b, 0), counts });
  });

  // List with search, status filter, sorting and pagination
  router.get('/', (req, res) => {
    const { q = '', status = '', sort = 'created', order = 'desc' } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

    const where = ['user_id = ?'];
    const params = [req.userId];
    if (q.trim()) {
      const like = `%${q.trim().replace(/[%_\\]/g, (c) => '\\' + c)}%`;
      where.push("(name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR company LIKE ? ESCAPE '\\')");
      params.push(like, like, like);
    }
    if (status) {
      if (!STATUSES.includes(status)) return res.status(400).json({ error: `Invalid status filter: ${status}` });
      where.push('status = ?');
      params.push(status);
    }

    const sortCol = SORTABLE[sort] || SORTABLE.created;
    const dir = String(order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const clause = where.join(' AND ');

    const total = db.prepare(`SELECT COUNT(*) AS n FROM leads WHERE ${clause}`).get(...params).n;
    const data = db
      .prepare(`SELECT * FROM leads WHERE ${clause} ORDER BY ${sortCol} ${dir}, id DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, (page - 1) * limit);

    res.json({ data, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
  });

  router.get('/:id', (req, res) => {
    const id = parseId(req.params.id);
    const lead = id && findOwn(id, req.userId);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json(lead);
  });

  router.post('/', (req, res) => {
    const { errors, value } = validateLead(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ error: 'Validation failed', details: errors });
    const { lastInsertRowid } = db
      .prepare('INSERT INTO leads (user_id, name, email, phone, company, source, status) VALUES (?,?,?,?,?,?,?)')
      .run(req.userId, value.name, value.email, value.phone, value.company, value.source, value.status);
    res.status(201).json(findOwn(Number(lastInsertRowid), req.userId));
  });

  router.put('/:id', (req, res) => {
    const id = parseId(req.params.id);
    const existing = id && findOwn(id, req.userId);
    if (!existing) return res.status(404).json({ error: 'Lead not found' });

    const { errors, value } = validateLead({ ...existing, ...req.body });
    if (Object.keys(errors).length) return res.status(400).json({ error: 'Validation failed', details: errors });

    db.prepare(
      `UPDATE leads SET name=?, email=?, phone=?, company=?, source=?, status=?, updated_at=datetime('now')
       WHERE id=? AND user_id=?`
    ).run(value.name, value.email, value.phone, value.company, value.source, value.status, id, req.userId);
    res.json(findOwn(id, req.userId));
  });

  router.delete('/:id', (req, res) => {
    const id = parseId(req.params.id);
    const info = id ? db.prepare('DELETE FROM leads WHERE id = ? AND user_id = ?').run(id, req.userId) : { changes: 0 };
    if (!info.changes) return res.status(404).json({ error: 'Lead not found' });
    res.status(204).end();
  });

  return router;
};
