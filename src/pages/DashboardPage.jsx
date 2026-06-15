import { useEffect, useState } from 'react';
import {
  Map, Plus, ShieldCheck, Layers, TrendingUp, Clock,
  ArrowRight, AlertTriangle, FileText, BarChart3
} from 'lucide-react';
import {
  PageHeader, Card, Badge, Metric, Spinner, EmptyState,
  pathwayLabel, confidenceTone, scoreTone
} from '../components/ui.jsx';
import { scanHistory, getScan } from '../services/api.js';

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DashboardPage({ user, setScreen, setScanResult }) {
  const [scans, setScans]     = useState(null);
  const [error, setError]     = useState(null);
  const [opening, setOpening] = useState(null);

  useEffect(() => {
    scanHistory(20)
      .then(setScans)
      .catch(() => setError('Could not load your scan history. Check that the API is running.'));
  }, []);

  const openScan = async (id) => {
    setOpening(id);
    try {
      const full = await getScan(id);
      setScanResult(full);
      setScreen('eligibility');
    } catch {
      setError('Could not open that scan — it may have been removed.');
    } finally {
      setOpening(null);
    }
  };

  const totalArea  = scans?.reduce((s, x) => s + (x.area_ha || 0), 0) ?? 0;
  const lastScan   = scans?.[0];
  const avgScore   = scans?.length
    ? Math.round(scans.reduce((s, x) => s + (x.eligibility_score || 0), 0) / scans.length)
    : null;

  return (
    <div className="page">
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0] || 'there'}`}
        subtitle="Your land assessments and carbon project pipeline at a glance."
        action={
          <button className="btn btn-primary" onClick={() => setScreen('boundary')}>
            <Plus size={15} /> New scan
          </button>
        }
      />

      <div className="metrics-row">
        <Metric icon={Layers}      label="Scans completed" value={scans ? scans.length : '—'} note="Across all parcels" tone="brand" />
        <Metric icon={Map}         label="Area assessed"   value={scans ? `${totalArea.toLocaleString(undefined, { maximumFractionDigits: 1 })} ha` : '—'} note="Total hectares scanned" />
        <Metric icon={ShieldCheck} label="Latest score"    value={lastScan ? `${lastScan.eligibility_score}/100` : '—'} note={lastScan ? pathwayLabel(lastScan.recommended_pathway) : 'Run your first scan'} />
        <Metric icon={TrendingUp}  label="Average score"   value={avgScore != null ? `${avgScore}/100` : '—'} note="All scans to date" />
      </div>

      <Card
        title="Scan history"
        action={scans?.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={() => setScreen('boundary')}>
            <Plus size={13} /> New scan
          </button>
        )}
      >
        {error && <div className="notice error"><AlertTriangle size={14} />{error}</div>}
        {!scans && !error && <Spinner text="Loading scan history…" />}

        {scans && scans.length === 0 && (
          <EmptyState
            icon={Map}
            title="No scans yet"
            body="Draw your first land boundary to get a satellite-backed eligibility assessment in under a minute."
            action={
              <button className="btn btn-primary" onClick={() => setScreen('boundary')}>
                <Map size={14} /> Scan my land
              </button>
            }
          />
        )}

        {scans && scans.length > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Parcel</th>
                  <th>Date</th>
                  <th className="num">Area</th>
                  <th>Score</th>
                  <th>Pathway</th>
                  <th>Confidence</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {scans.map(s => (
                  <tr key={s.id}>
                    <td className="cell-strong">{s.land_name || 'Unnamed parcel'}</td>
                    <td className="cell-muted"><Clock size={12} /> {formatDate(s.created_at)}</td>
                    <td className="num">{s.area_ha?.toLocaleString()} ha</td>
                    <td><Badge tone={scoreTone(s.eligibility_score)}>{s.eligibility_score}/100</Badge></td>
                    <td><Badge tone={s.recommended_pathway === 'peatland' ? 'amber' : s.recommended_pathway === 'wcc' ? 'green' : 'gray'}>{pathwayLabel(s.recommended_pathway)}</Badge></td>
                    <td><Badge tone={confidenceTone(s.confidence)}>{s.confidence || '—'}</Badge></td>
                    <td className="cell-action">
                      <button className="btn btn-ghost btn-sm" disabled={opening === s.id} onClick={() => openScan(s.id)}>
                        {opening === s.id ? 'Opening…' : 'View'} <ArrowRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="two-col-grid">
        <Card title="Next steps">
          <div className="quick-actions">
            {[
              [Map,        'Scan a new parcel',     'Draw a boundary and get a satellite-backed assessment.', 'boundary'],
              [FileText,   'Generate a PDF report', 'Export your latest assessment for VVB review.',          'report'],
              [BarChart3,  'Browse the marketplace','Live projects from Verra, Gold Standard and OHMC UK.',   'marketplace'],
            ].map(([Icon, title, body, target]) => (
              <button key={title} className="quick-action" onClick={() => setScreen(target)}>
                <span className="quick-action-icon"><Icon size={16} /></span>
                <span className="quick-action-text">
                  <strong>{title}</strong>
                  <small>{body}</small>
                </span>
                <ArrowRight size={14} className="quick-action-arrow" />
              </button>
            ))}
          </div>
        </Card>

        <Card title="How OHMC works">
          <ol className="mini-steps">
            <li><strong>Scan.</strong> Draw your boundary — we compute NDVI, soil carbon and land cover from live Sentinel-2 and SoilGrids data.</li>
            <li><strong>Assess.</strong> A deterministic rules engine checks WCC v2.1 and Peatland Code v1.1 criteria, rule by rule.</li>
            <li><strong>Report.</strong> Download a structured eligibility report ready for VVB review.</li>
            <li><strong>Connect.</strong> Once validated, your project reaches curated corporate buyers.</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
