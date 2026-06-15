import { AlertTriangle, Loader } from 'lucide-react';

// ── Shared UI primitives ──────────────────────────────────────────────────────

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="page-action">{action}</div>}
    </div>
  );
}

export function Card({ title, children, className = '', action }) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <div className="card-header">
          <h3>{title}</h3>
          {action && <span className="card-action">{action}</span>}
        </div>
      )}
      <div className="card-body">{children}</div>
    </section>
  );
}

export function Badge({ children, tone = 'gray' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function StatRow({ label, value, badge, tone }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      {badge
        ? <Badge tone={tone || 'gray'}>{value}</Badge>
        : <strong className="stat-value">{value}</strong>}
    </div>
  );
}

export function Metric({ icon: Icon, label, value, note, tone = 'default' }) {
  return (
    <div className={`metric-card tone-${tone}`}>
      <div className="metric-top">
        <span className="metric-label">{label}</span>
        {Icon && <span className="metric-icon"><Icon size={15} /></span>}
      </div>
      <strong className="metric-value">{value}</strong>
      {note && <small className="metric-note">{note}</small>}
    </div>
  );
}

export function Disclaimer() {
  return (
    <div className="disclaimer">
      <AlertTriangle size={14} />
      <span>
        Preliminary screening estimates only — not verified credits or guaranteed revenue.
        Official credit issuance requires independent VVB validation.
      </span>
    </div>
  );
}

export function Spinner({ text = 'Loading…' }) {
  return (
    <div className="spinner-wrap">
      <Loader size={20} className="spin" /><span>{text}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="empty-state">
      {Icon && <div className="empty-state-icon"><Icon size={26} strokeWidth={1.7} /></div>}
      <h3>{title}</h3>
      {body && <p>{body}</p>}
      {action}
    </div>
  );
}

// Score ring — SVG dial used on eligibility + report screens
export function ScoreRing({ score = 0, size = 132 }) {
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const tone = pct >= 70 ? 'var(--green-600)' : pct >= 45 ? 'var(--amber-600)' : 'var(--red-600)';
  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--gray-150)" strokeWidth="9" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={tone} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="score-ring-text">
        <strong>{score}</strong>
        <span>/ 100</span>
      </div>
    </div>
  );
}

export const pathwayLabel = (p) =>
  p === 'peatland' ? 'Peatland Code' : p === 'wcc' ? 'Woodland Carbon Code' : 'No clear pathway';

export const confidenceTone = (c) =>
  c === 'high' ? 'green' : c === 'medium' ? 'amber' : 'gray';

export const scoreTone = (s) =>
  s >= 70 ? 'green' : s >= 45 ? 'amber' : 'red';
