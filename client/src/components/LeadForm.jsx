import { useState } from 'react';
import { api } from '../api.js';
import { validateLead } from '../validation.js';
import Field from './Field.jsx';

export default function LeadForm({ lead, meta, onSaved, onCancel }) {
  const [form, setForm] = useState({
    name: lead?.name ?? '', email: lead?.email ?? '', phone: lead?.phone ?? '',
    company: lead?.company ?? '', source: lead?.source ?? '', status: lead?.status ?? 'New',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    const errs = validateLead(form, meta.sources, meta.statuses);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await (lead ? api.update(lead.id, form) : api.create(form));
      onSaved(lead ? 'Lead updated' : 'Lead added');
    } catch (err) {
      setErrors(err.details || {});
      setFormError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <h2>{lead ? 'Edit lead' : 'Add a lead'}</h2>
      {formError && <div className="banner error" role="alert">{formError}</div>}
      <div className="grid-2">
        <Field label="Name *" error={errors.name}><input value={form.name} onChange={set('name')} autoFocus /></Field>
        <Field label="Company *" error={errors.company}><input value={form.company} onChange={set('company')} /></Field>
        <Field label="Email *" error={errors.email}><input type="email" value={form.email} onChange={set('email')} /></Field>
        <Field label="Phone *" error={errors.phone}><input type="tel" value={form.phone} onChange={set('phone')} /></Field>
        <Field label="Source *" error={errors.source}>
          <select value={form.source} onChange={set('source')}>
            <option value="">Select source…</option>
            {meta.sources.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Status *" error={errors.status}>
          <select value={form.status} onChange={set('status')}>
            {meta.statuses.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <div className="actions">
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : lead ? 'Save changes' : 'Add lead'}</button>
      </div>
    </form>
  );
}
