import { useState } from 'react';
import {
  ShieldCheck, FileText, Workflow, CheckCircle, ArrowRight,
  AlertTriangle, Loader, Mail
} from 'lucide-react';
import { PageHeader, Card, Badge } from '../components/ui.jsx';

const BENEFITS = [
  {
    icon: FileText,
    title: 'Pre-screened pipeline',
    body: 'Projects arrive with satellite data, soil baselines and a structured evidence pack already attached — no cold starts.',
  },
  {
    icon: Workflow,
    title: 'Tracked workflow',
    body: 'Non-conformances, document requests and validation milestones tracked in one shared workspace with the landowner.',
  },
  {
    icon: ShieldCheck,
    title: 'Standards-bound',
    body: 'Everything maps to WCC v2.1 and Peatland Code v1.1 rule IDs, so your review starts from auditable evidence.',
  },
];

export default function PartnerPage() {
  const [form, setForm] = useState({ name: '', org: '', email: '', type: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.org) { setError('Please fill in your name, organisation and email.'); return; }
    setError(''); setSubmitting(true);
    // Partner onboarding is handled manually during the pilot — applications
    // are forwarded to the OHMC team inbox.
    const subject = encodeURIComponent(`Partner application — ${form.org}`);
    const body = encodeURIComponent(
      `Name: ${form.name}\nOrganisation: ${form.org}\nEmail: ${form.email}\nPartner type: ${form.type || 'Not specified'}`
    );
    window.location.href = `mailto:partners@ohmc.co.uk?subject=${subject}&body=${body}`;
    setTimeout(() => { setSubmitting(false); setSubmitted(true); }, 400);
  };

  return (
    <div className="page">
      <PageHeader
        title="Partner programme"
        subtitle="For VVBs, ecologists, soil labs and project developers working with UK land carbon."
      />

      <div className="partner-hero card">
        <div>
          <Badge tone="green">Now onboarding — pilot cohort</Badge>
          <h2>Receive a pipeline of pre-screened projects, ready for validation.</h2>
          <p>
            CarbonOS pre-screens land parcels against WCC and Peatland Code criteria and generates
            structured evidence packs before they reach your desk — cutting review time and raising
            submission quality from day one. Partners receive a referral fee on successful onboarding.
          </p>
        </div>
        <div className="partner-hero-stats">
          {[
            ['< 60s', 'First screening result'],
            ['Rule-ID', 'Mapped evidence packs'],
            ['£0', 'Cost to join the pilot'],
          ].map(([v, l]) => (
            <div key={l} className="partner-stat"><strong>{v}</strong><span>{l}</span></div>
          ))}
        </div>
      </div>

      <div className="benefit-grid">
        {BENEFITS.map(({ icon: Icon, title, body }) => (
          <Card key={title}>
            <div className="benefit-icon"><Icon size={17} /></div>
            <h4 className="benefit-title">{title}</h4>
            <p className="body-text">{body}</p>
          </Card>
        ))}
      </div>

      <div className="two-col-grid">
        <Card title="How partnership works">
          <ol className="mini-steps">
            <li><strong>Apply.</strong> Tell us who you are and which standards you work with.</li>
            <li><strong>Verify.</strong> We confirm accreditation status (UKAS / scheme-approved bodies prioritised).</li>
            <li><strong>Receive referrals.</strong> Matched projects arrive with their full screening data attached.</li>
            <li><strong>Collaborate.</strong> Track non-conformances and milestones in a shared workspace (Phase 3).</li>
          </ol>
          <div className="notice info">
            <AlertTriangle size={13} />
            The collaborative validation workspace ships in Phase 3. Pilot partners receive referrals
            by email with full data exports today.
          </div>
        </Card>

        <Card title="Apply to join">
          {submitted ? (
            <div className="success-state">
              <CheckCircle size={40} className="ico-green" />
              <h3>Application started</h3>
              <p>Your email client should have opened with your application. We respond to every application within 3 business days.</p>
              <p className="body-text">
                Nothing happened? Email us directly at <a className="text-link" href="mailto:partners@ohmc.co.uk">partners@ohmc.co.uk</a>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field">
                  <label>Your name *</label>
                  <input className="input" placeholder="Full name" value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
                <div className="field">
                  <label>Organisation *</label>
                  <input className="input" placeholder="Company / body name" value={form.org} onChange={e => set('org', e.target.value)} />
                </div>
                <div className="field">
                  <label>Email *</label>
                  <input className="input" type="email" placeholder="you@organisation.co.uk" value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
                <div className="field">
                  <label>Partner type</label>
                  <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
                    <option value="">Select type</option>
                    {['VVB / Certification body', 'Ecologist / Surveyor', 'Soil laboratory', 'Project developer', 'Land agent', 'Other'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              {error && <div className="notice error"><AlertTriangle size={13} />{error}</div>}
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting
                  ? <><Loader size={14} className="spin" /> Opening email…</>
                  : <><Mail size={14} /> Apply via email <ArrowRight size={13} /></>}
              </button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
