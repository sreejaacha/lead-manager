const jwt = require('jsonwebtoken');

const secret = () => process.env.JWT_SECRET || 'dev-only-secret';

function signToken(user) {
  return jwt.sign({ sub: user.id }, secret(), { expiresIn: '7d' });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.userId = jwt.verify(token, secret()).sub;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Express 4 doesn't catch async errors; this keeps handlers tidy.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function notFound(req, res) {
  res.status(404).json({ error: 'Route not found' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON body' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
}

module.exports = { signToken, requireAuth, wrap, notFound, errorHandler };
