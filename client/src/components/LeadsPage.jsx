import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import Dashboard from './Dashboard.jsx';
import LeadForm from './LeadForm.jsx';
import Modal from './Modal.jsx';

const COLUMNS = [
  { key: 'name', label: 'Name', sort: 'name' },
  { key: 'company', label: 'Company', sort: 'company' },
  { key: 'contact', label: 'Contact' },
  { key: 'source', label: 'Source' },
  { key: 'status', label: 'Status', sort: 'status' },
  { key: 'created', label: 'Added', sort: 'created' },
];

export default function LeadsPage({ user, onLogout }) {
  const [meta, setMeta] = useState(null);
  const [stats, setStats] = useState(null);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [query, setQuery] = useState({ q: '', status: '', sort: 'created', order: 'desc', page: 1 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // { type: 'form'|'delete', lead? }
  const [toast, setToast] = useState('');
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [list, st] = await Promise.all([api.list({ ...query, limit: 8 }), api.stats()]);
      setRows(list.data);
      setPagination(list.pagination);
      setStats(st);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { api.meta().then(setMeta).catch((e) => setError(e.message)); }, []);
  useEffect(() => { load(); }, [load]);

  // Debounce the search box so we don't hit the API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setQuery((q) => (q.q === search ? q : { ...q, q: search, page: 1 })), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 2500); return () => clearTimeout(t); } }, [toast]);

  const sortBy = (col) => setQuery((q) => ({ ...q, sort: col, order: q.sort === col && q.order === 'asc' ? 'desc' : 'asc', page: 1 }));
  const saved = (msg) => { setModal(null); setToast(msg); load(); };

  async function confirmDelete() {
    setDeleting(true);
    try {
      await api.remove(modal.lead.id);
      setModal(null);
      setToast('Lead deleted');
      // Step back a page if we just removed the last row on this page
      if (rows.length === 1 && query.page > 1) setQuery((q) => ({ ...q, page: q.page - 1 }));
      else load();
    } catch (e) {
      setError(e.message);
      setModal(null);
    } finally {
      setDeleting(false);
    }
  }

  const hasFilters = query.q || query.status;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">Lead<span>Ledger</span></div>
        <div className="who">
          <span className="muted hide-sm">{user.name}</span>
          <button className="btn small" onClick={onLogout}>Log out</button>
        </div>
      </header>

      <main className="content">
        <Dashboard stats={stats} active={query.status} onPick={(s) => setQuery((q) => ({ ...q, status: s, page: 1 }))} />

        <div className="toolbar">
          <input className="search" type="search" placeholder="Search by name, email or company…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search leads" />
          <select value={query.status} onChange={(e) => setQuery({ ...query, status: e.target.value, page: 1 })} aria-label="Filter by status">
            <option value="">All statuses</option>
            {meta?.statuses.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button className="btn primary" disabled={!meta} onClick={() => setModal({ type: 'form' })}>+ Add lead</button>
        </div>

        {error && (
          <div className="banner error" role="alert">
            {error} <button className="link" onClick={load}>Retry</button>
          </div>
        )}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th key={c.key} className={c.sort ? 'sortable' : ''} onClick={c.sort ? () => sortBy(c.sort) : undefined} aria-sort={query.sort === c.sort ? (query.order === 'asc' ? 'ascending' : 'descending') : undefined}>
                    {c.label}{query.sort === c.sort && <span className="arrow">{query.order === 'asc' ? ' ▲' : ' ▼'}</span>}
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody className={loading ? 'loading' : ''}>
              {rows.map((l) => (
                <tr key={l.id}>
                  <td data-label="Name"><strong>{l.name}</strong></td>
                  <td data-label="Company">{l.company}</td>
                  <td data-label="Contact"><div>{l.email}</div><div className="muted">{l.phone}</div></td>
                  <td data-label="Source">{l.source}</td>
                  <td data-label="Status"><span className={`badge s-${l.status}`}>{l.status}</span></td>
                  <td data-label="Added" className="muted">{new Date(l.created_at + 'Z').toLocaleDateString()}</td>
                  <td className="row-actions">
                    <button className="btn small" onClick={() => setModal({ type: 'form', lead: l })}>Edit</button>
                    <button className="btn small danger" onClick={() => setModal({ type: 'delete', lead: l })}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !rows.length && !error && (
            <div className="empty">
              {hasFilters ? 'No leads match your search.' : 'No leads yet — add your first one to get started.'}
            </div>
          )}
        </div>

        <div className="pager">
          <span className="muted">{pagination.total} lead{pagination.total === 1 ? '' : 's'}</span>
          <div>
            <button className="btn small" disabled={query.page <= 1} onClick={() => setQuery({ ...query, page: query.page - 1 })}>← Prev</button>
            <span className="page-n">Page {pagination.page} of {pagination.totalPages}</span>
            <button className="btn small" disabled={query.page >= pagination.totalPages} onClick={() => setQuery({ ...query, page: query.page + 1 })}>Next →</button>
          </div>
        </div>
      </main>

      {modal?.type === 'form' && (
        <Modal onClose={() => setModal(null)}>
          <LeadForm lead={modal.lead} meta={meta} onSaved={saved} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal?.type === 'delete' && (
        <Modal onClose={() => setModal(null)}>
          <h2>Delete this lead?</h2>
          <p>
            <strong>{modal.lead.name}</strong> ({modal.lead.company}) will be permanently removed. This can't be undone.
          </p>
          <div className="actions">
            <button className="btn" onClick={() => setModal(null)} disabled={deleting}>Cancel</button>
            <button className="btn danger solid" onClick={confirmDelete} disabled={deleting}>{deleting ? 'Deleting…' : 'Yes, delete'}</button>
          </div>
        </Modal>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
