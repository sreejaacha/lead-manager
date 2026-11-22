const STATUSES = ['New', 'Contacted', 'Qualified', 'Lost'];
const SOURCES = ['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Event', 'Advertisement', 'Other'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9\s\-()]{7,20}$/;

const str = (v) => (typeof v === 'string' ? v.trim() : '');

/** Returns { errors, value }. `errors` is an object keyed by field name. */
function validateLead(body = {}) {
  const value = {
    name: str(body.name),
    email: str(body.email).toLowerCase(),
    phone: str(body.phone),
    company: str(body.company),
    source: str(body.source),
    status: str(body.status) || 'New',
  };
  const errors = {};

  if (value.name.length < 2 || value.name.length > 100) errors.name = 'Name must be 2–100 characters';
  if (!EMAIL_RE.test(value.email)) errors.email = 'Enter a valid email address';
  if (!PHONE_RE.test(value.phone)) errors.phone = 'Enter a valid phone number (7–20 digits)';
  if (!value.company || value.company.length > 100) errors.company = 'Company is required (max 100 characters)';
  if (!SOURCES.includes(value.source)) errors.source = `Source must be one of: ${SOURCES.join(', ')}`;
  if (!STATUSES.includes(value.status)) errors.status = `Status must be one of: ${STATUSES.join(', ')}`;

  return { errors, value };
}

function validateSignup(body = {}) {
  const value = { name: str(body.name), email: str(body.email).toLowerCase(), password: typeof body.password === 'string' ? body.password : '' };
  const errors = {};
  if (value.name.length < 2) errors.name = 'Name must be at least 2 characters';
  if (!EMAIL_RE.test(value.email)) errors.email = 'Enter a valid email address';
  if (value.password.length < 8) errors.password = 'Password must be at least 8 characters';
  return { errors, value };
}

module.exports = { STATUSES, SOURCES, validateLead, validateSignup };
