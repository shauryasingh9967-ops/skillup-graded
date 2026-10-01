export function Card({ title, subtitle, actions, children, flush, className = '', bodyClass = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-head">
          <div>{title && <h2>{title}</h2>}{subtitle && <p>{subtitle}</p>}</div>
          {actions}
        </div>
      )}
      <div className={`card-body ${flush ? 'flush' : ''} ${bodyClass}`} style={!title && !actions && !flush ? { paddingTop: 20 } : undefined}>{children}</div>
    </section>
  );
}

export function KpiCard({ label, value, sub, tone = '' }) {
  return (
    <div className={`card kpi ${tone ? `tone-${tone}` : ''}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="page-header">
      <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
      {actions && <div className="page-actions no-print">{actions}</div>}
    </div>
  );
}

export function Tabs({ tabs, value, onChange, label = 'Sections' }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={value === t.id} aria-controls={`panel-${t.id}`} className="tab" onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export const TabPanel = ({ id, children }) => <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`}>{children}</div>;

export function Meter({ value, tone }) {
  return <div className={`meter ${tone || ''}`} role="img" aria-label={value == null ? 'No data' : `${value} percent`}><span style={{ width: `${Math.max(0, Math.min(100, value || 0))}%` }} /></div>;
}

export function Avatar({ name, large }) {
  const text = (name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join('') || '?';
  return <span className={`avatar ${large ? 'avatar-lg' : ''}`} aria-hidden="true">{text}</span>;
}
