import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import Button from './Button';

export function Skeleton({ width = '100%', height = 14, style, className = '' }) {
  return <span className={`skeleton ${className}`} style={{ width, height, ...style }} aria-hidden="true" />;
}

export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div style={{ padding: '8px 16px' }} aria-busy="true" aria-label="Loading data">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'grid', gridTemplateColumns: `2fr repeat(${cols - 1}, 1fr)`, gap: 20, padding: '17px 0', borderBottom: '1px solid var(--border)' }}>
          {Array.from({ length: cols }).map((__, c) => <Skeleton key={c} height={14} width={c === 0 ? '70%' : '55%'} />)}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ height = 220 }) {
  return <div style={{ padding: 20 }} aria-busy="true" aria-label="Loading"><Skeleton height={height} style={{ borderRadius: 10 }} /></div>;
}

export function EmptyState({ icon: Icon = Inbox, title, message, action }) {
  return (
    <div className="state">
      <div className="state-icon"><Icon size={22} aria-hidden="true" /></div>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'Could not load this section' }) {
  return (
    <div className="state error" role="alert">
      <div className="state-icon"><AlertTriangle size={22} aria-hidden="true" /></div>
      <h3>{title}</h3>
      <p>{error?.message || 'Something went wrong. Please try again.'}</p>
      {onRetry && <Button icon={RefreshCw} onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function Alert({ tone = 'info', children, icon: Icon = AlertTriangle }) {
  return (
    <div className={`alert ${tone === 'danger' ? 'alert-danger' : tone === 'warning' ? 'alert-warning' : ''}`} role={tone === 'danger' ? 'alert' : undefined}>
      <Icon size={18} aria-hidden="true" style={{ flex: 'none', marginTop: 1 }} />
      <div>{children}</div>
    </div>
  );
}
