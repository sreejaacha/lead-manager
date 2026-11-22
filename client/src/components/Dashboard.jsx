export default function Dashboard({ stats, active, onPick }) {
  const cards = [{ key: '', label: 'All leads', n: stats?.total ?? '–' },
    ...['New', 'Contacted', 'Qualified', 'Lost'].map((s) => ({ key: s, label: s, n: stats?.counts[s] ?? '–' }))];
  return (
    <div className="stats">
      {cards.map((c) => (
        <button key={c.key} className={`stat ${active === c.key ? 'active' : ''} ${c.key ? 's-' + c.key : ''}`} onClick={() => onPick(c.key)}>
          <span className="stat-n">{c.n}</span>
          <span className="stat-l">{c.label}</span>
        </button>
      ))}
    </div>
  );
}
