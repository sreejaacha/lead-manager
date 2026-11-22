import { useState } from 'react';
import { api } from '../api.js';
import { validateAuth } from '../validation.js';
import Field from './Field.jsx';

export default function AuthPage({ onAuth }) {
  const [isSignup, setIsSignup] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    const errs = validateAuth(form, isSignup);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      onAuth(await (isSignup ? api.signup(form) : api.login(form)));
    } catch (err) {
      setErrors(err.details || {});
      setFormError(err.details && Object.keys(err.details).length ? '' : err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <aside className="auth-aside">
        <div className="brand">Lead<span>Ledger</span></div>
        <p className="tagline">Every lead, one clear status. Know who to call next.</p>
        <ul className="pipeline-preview">
          {['New', 'Contacted', 'Qualified', 'Lost'].map((s) => (
            <li key={s}><span className={`dot s-${s}`} /> {s}</li>
          ))}
        </ul>
      </aside>
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1>{isSignup ? 'Create your account' : 'Welcome back'}</h1>
        <p className="muted">{isSignup ? 'Start tracking your leads in minutes.' : 'Sign in to see your pipeline.'}</p>
        {formError && <div className="banner error" role="alert">{formError}</div>}
        {isSignup && <Field label="Full name" error={errors.name}><input value={form.name} onChange={set('name')} autoComplete="name" /></Field>}
        <Field label="Email" error={errors.email}><input type="email" value={form.email} onChange={set('email')} autoComplete="email" /></Field>
        <Field label="Password" error={errors.password}>
          <input type="password" value={form.password} onChange={set('password')} autoComplete={isSignup ? 'new-password' : 'current-password'} />
        </Field>
        <button className="btn primary block" disabled={busy}>{busy ? 'Please wait…' : isSignup ? 'Sign up' : 'Log in'}</button>
        <p className="switch">
          {isSignup ? 'Already have an account?' : 'New here?'}{' '}
          <button type="button" className="link" onClick={() => { setIsSignup(!isSignup); setErrors({}); setFormError(''); }}>
            {isSignup ? 'Log in' : 'Create an account'}
          </button>
        </p>
      </form>
    </div>
  );
}
