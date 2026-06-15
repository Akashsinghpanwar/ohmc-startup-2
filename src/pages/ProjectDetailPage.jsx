import { useState } from 'react';
import {
  MapPin, CheckCircle, X, ArrowRight, AlertTriangle, Loader,
  ArrowLeft, ExternalLink
} from 'lucide-react';
import { Card, StatRow, Badge, EmptyState } from '../components/ui.jsx';
import { registerInterest } from '../services/api.js';
import { TRUST_TONE, SOURCE_LABELS } from './MarketplacePage.jsx';

export default function ProjectDetailPage({ setScreen, user, project }) {
  const [submitted, setSubmitted]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [form, setForm] = useState({
    name: user?.name || '', org: '', email: user?.email || '', volume: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  if (!project) {
    return (
      <div className="page">
        <Card>
          <EmptyState
            title="No project selected"
            body="Pick a project from the marketplace to see its details."
            action={
              <button className="btn btn-primary" onClick={() => setScreen('marketplace')}>
                Browse marketplace
              </button>
            }
          />
        </Card>
      </div>
    );
  }

  const tone    = TRUST_TONE[project.status] || 'gray';
  const src     = SOURCE_LABELS[project.source] || SOURCE_LABELS.local;
  const isLocal = (project.source || 'local') === 'local';
  const canRegisterInterest = isLocal && project.id;

  async function handleInterest(e) {
    e.preventDefault();
    if (!form.name || !form.email) { setError('Please provide your name and email.'); return; }
    setError(''); setSubmitting(true);
    try {
      await registerInterest(project.id, {
        buyer_name: form.name,
        organisation: form.org,
        email: form.email,
        volume_interest: form.volume,
      });
      setSubmitted(true);
    } catch {
      setError('Could not register interest right now — please try again shortly.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <button className="btn btn-ghost btn-sm back-btn" onClick={() => setScreen('marketplace')}>
        <ArrowLeft size={14} /> Back to marketplace
      </button>

      <div className="project-hero card">
        <div className="project-hero-badges">
          <Badge tone={tone}>{project.status}</Badge>
          <span className={`src-badge ${src.cls}`}>{src.label}</span>
        </div>
        <h1>{project.title}</h1>
        <p className="project-hero-loc"><MapPin size={14} /> {project.location || 'Location undisclosed'}</p>
        <div className="project-facts-row">
          {project.volume_tco2e && <span><strong>{project.volume_tco2e}</strong> annual volume</span>}
          {project.vintage      && <span><strong>{project.vintage}</strong> vintage</span>}
          {project.methodology  && <span><strong>{project.methodology}</strong> methodology</span>}
          {project.type         && <span><strong>{project.type}</strong></span>}
        </div>
        {project.registry_url && (
          <a className="btn btn-secondary btn-sm" href={project.registry_url} target="_blank" rel="noopener noreferrer">
            View on {src.label} registry <ExternalLink size={12} />
          </a>
        )}
      </div>

      {project.status !== 'Verified Credit' && project.status !== 'Retired' && (
        <div className="notice warn">
          <AlertTriangle size={14} />
          {project.status} status — no offset claims permitted. You may register interest and request due diligence only.
        </div>
      )}

      <div className="two-col-grid">
        <Card title="Project overview">
          <p className="body-text">
            {project.description ||
              'This project is listed via a public carbon registry. Detailed project documentation is available from the source registry. OHMC presents registry data as-is and does not certify third-party listings.'}
          </p>
          <div className="small-facts">
            {[
              ['Proponent',   project.proponent || project.developer],
              ['Registry ID', project.registry_id || project.id],
              ['Country',     project.country],
              ['Total volume', project.total_tco2e],
            ].filter(([, v]) => v).map(([l, v]) => (
              <StatRow key={l} label={l} value={String(v)} />
            ))}
          </div>
        </Card>

        <Card title="Claims guidance">
          <div className="claims-split">
            <div>
              <h4 className="claims-can">You can</h4>
              {['Register interest', 'Request due diligence pack', 'Demonstrate purchase intent'].map(i => (
                <div key={i} className="checklist-row"><CheckCircle size={13} className="ico-green" /><span>{i}</span></div>
              ))}
            </div>
            <div>
              <h4 className="claims-cannot">You cannot claim</h4>
              {['Net zero offset', 'Specific reductions', 'Carbon neutrality'].map(i => (
                <div key={i} className="checklist-row"><X size={13} className="ico-red" /><span>{i}</span></div>
              ))}
            </div>
          </div>
          {project.claim_guidance && <p className="claim-note">{project.claim_guidance}</p>}
        </Card>
      </div>

      {canRegisterInterest ? (
        <Card title="Register buyer interest">
          {submitted ? (
            <div className="success-state">
              <CheckCircle size={40} className="ico-green" />
              <h3>Interest registered</h3>
              <p>OHMC will be in touch within 2 business days with next steps and a due diligence pack.</p>
            </div>
          ) : (
            <form onSubmit={handleInterest}>
              <p className="body-text">No commitment required. OHMC will facilitate introductions and provide full guidance.</p>
              <div className="form-grid">
                <div className="field">
                  <label>Your name *</label>
                  <input className="input" placeholder="Full name" value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
                <div className="field">
                  <label>Organisation</label>
                  <input className="input" placeholder="Company name" value={form.org} onChange={e => set('org', e.target.value)} />
                </div>
                <div className="field">
                  <label>Email *</label>
                  <input className="input" type="email" placeholder="you@company.com" value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
                <div className="field">
                  <label>Volume of interest</label>
                  <select className="input" value={form.volume} onChange={e => set('volume', e.target.value)}>
                    <option value="">Select range</option>
                    {['Under 1,000 tCO₂e', '1,000–5,000 tCO₂e', '5,000–20,000 tCO₂e', 'Over 20,000 tCO₂e'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              {error && <div className="notice error"><AlertTriangle size={13} />{error}</div>}
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <><Loader size={14} className="spin" /> Registering…</> : <>Register interest <ArrowRight size={14} /></>}
              </button>
            </form>
          )}
        </Card>
      ) : (
        <Card title="Interested in this project?">
          <p className="body-text">
            This project is listed on the {src.label} registry. OHMC brokerage and buyer matching
            applies to OHMC-listed UK projects — for third-party registry projects, contact the
            project proponent directly via the source registry.
          </p>
          {project.registry_url && (
            <a className="btn btn-secondary" href={project.registry_url} target="_blank" rel="noopener noreferrer">
              Open {src.label} listing <ExternalLink size={13} />
            </a>
          )}
        </Card>
      )}
    </div>
  );
}
