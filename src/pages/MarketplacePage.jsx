import { useEffect, useState } from 'react';
import { MapPin, Leaf, ArrowRight, AlertTriangle, ExternalLink, BarChart3 } from 'lucide-react';
import { PageHeader, Card, Spinner, EmptyState } from '../components/ui.jsx';
import { listMarketplace } from '../services/api.js';

export const TRUST_TONE = {
  'Estimated Only': 'gray', 'Pre-Validation': 'amber',
  'Validated PIU': 'blue', 'Verified Credit': 'green', 'Retired': 'green',
};

export const SOURCE_LABELS = {
  verra:        { label: 'Verra VCS',     cls: 'src-verra' },
  goldstandard: { label: 'Gold Standard', cls: 'src-gs' },
  local:        { label: 'OHMC UK',       cls: 'src-local' },
};

const STATUSES = ['All', 'Estimated Only', 'Pre-Validation', 'Validated PIU', 'Verified Credit'];

export default function MarketplacePage({ setScreen, setSelectedProject }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [filter, setFilter]     = useState('All');
  const [source, setSource]     = useState('all');

  const load = (src) => {
    setLoading(true); setError(null);
    listMarketplace({ source: src })
      .then(d => { setProjects(d); setLoading(false); })
      .catch(() => { setError('Could not load projects. Check that the API is running.'); setLoading(false); });
  };

  useEffect(() => { load('all'); }, []);

  const filtered = filter === 'All' ? projects : projects.filter(p => p.status === filter);

  const openProject = (p) => {
    setSelectedProject(p);
    setScreen('project');
  };

  return (
    <div className="page">
      <PageHeader
        title="Carbon marketplace"
        subtitle="Live project data from the Verra VCS, Gold Standard and OHMC UK registries."
      />

      <div className="mkt-toolbar">
        <div className="seg-control">
          {[['all', 'All sources'], ['verra', 'Verra VCS'], ['goldstandard', 'Gold Standard'], ['local', 'OHMC UK']].map(([id, label]) => (
            <button key={id}
              className={`seg-btn ${source === id ? 'active' : ''}`}
              onClick={() => { setSource(id); load(id); }}>
              {label}
            </button>
          ))}
        </div>
        <div className="filter-bar">
          {STATUSES.map(s => (
            <button key={s} className={`filter-chip ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>{s}</button>
          ))}
        </div>
        {!loading && <span className="mkt-count">{filtered.length} of {projects.length} projects</span>}
      </div>

      {loading && <Spinner text="Fetching live registry data…" />}
      {error   && <div className="notice error"><AlertTriangle size={14} />{error}</div>}

      {!loading && !error && (
        filtered.length > 0 ? (
          <div className="project-grid">
            {filtered.map((p, i) => (
              <ProjectCard key={p.id || p.registry_id || i} project={p} onOpen={() => openProject(p)} />
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState
              icon={BarChart3}
              title="No projects match this filter"
              body="Try a different status or registry source."
            />
          </Card>
        )
      )}
    </div>
  );
}

function ProjectCard({ project: p, onOpen }) {
  const tone = TRUST_TONE[p.status] || 'gray';
  const src = SOURCE_LABELS[p.source] || SOURCE_LABELS.local;
  return (
    <div className="project-card">
      <div className="project-card-header">
        <span className={`badge badge-${tone}`}>{p.status}</span>
        <span className={`src-badge ${src.cls}`}>{src.label}</span>
      </div>
      <div className="project-card-body">
        <h3>{p.title}</h3>
        <p className="project-loc"><MapPin size={12} />{p.location || 'Location undisclosed'}</p>
        <p className="project-type"><Leaf size={12} />{p.type}{p.methodology ? ` · ${p.methodology}` : ''}</p>
        <div className="project-vols">
          <span><small>Annual volume</small><strong>{p.volume_tco2e || 'N/A'}</strong></span>
          <span><small>Total</small><strong>{p.total_tco2e || 'N/A'}</strong></span>
        </div>
        {p.claim_guidance && <p className="claim-note">{p.claim_guidance}</p>}
      </div>
      <div className="project-card-actions">
        <button className="btn btn-secondary btn-block" onClick={onOpen}>
          View details <ArrowRight size={13} />
        </button>
        {p.registry_url && (
          <a href={p.registry_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" title="Open in source registry">
            <ExternalLink size={13} />
          </a>
        )}
      </div>
    </div>
  );
}
