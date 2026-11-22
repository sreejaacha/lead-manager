// Mirrors server/src/validation.js so users get instant feedback.
// The server remains the source of truth and re-validates everything.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9\s\-()]{7,20}$/;

export function validateLead(v, sources, statuses) {
  const e = {};
  if (v.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
  if (!EMAIL_RE.test(v.email.trim())) e.email = 'Enter a valid email address';
  if (!PHONE_RE.test(v.phone.trim())) e.phone = 'Enter a valid phone number (7–20 digits)';
  if (!v.company.trim()) e.company = 'Company is required';
  if (!sources.includes(v.source)) e.source = 'Choose a source';
  if (!statuses.includes(v.status)) e.status = 'Choose a status';
  return e;
}

export function validateAuth(v, isSignup) {
  const e = {};
  if (isSignup && v.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
  if (!EMAIL_RE.test(v.email.trim())) e.email = 'Enter a valid email address';
  if (isSignup ? v.password.length < 8 : !v.password) e.password = isSignup ? 'Password must be at least 8 characters' : 'Enter your password';
  return e;
}
