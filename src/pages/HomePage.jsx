import { useState } from 'react';
import logoImg from '../assets/logo.png';
import {
  ArrowRight, CheckCircle, Map, ShieldCheck, FileText,
  Handshake, TrendingUp, Star, Menu, X, AlertTriangle,
  Lock, BarChart3, Leaf, Users
} from 'lucide-react';

const IMGS = {
  hero:    'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=2000&q=85',
  peat:    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80',
  sat:     'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
  gallery: [
    'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&q=80',
  ],
};

// ── Nav ───────────────────────────────────────────────────────────────────────
function PublicNav({ goTo }) {
  const [open, setOpen] = useState(false);
  return (
    <nav className="pub-nav">
      <div className="pub-nav-inner">
        <button className="pub-logo" onClick={() => goTo('home')}>
          <img src={logoImg} alt="OHMC" className="pub-logo-img" />
        </button>
        <div className={`pub-links ${open ? 'open' : ''}`}>
          {[['How It Works', '#how'],['The Problem', '#problem'],['For Landowners', '#landowners'],['Marketplace', 'marketplace']].map(([label, href]) => (
            <a key={label} className="pub-link"
              href={href.startsWith('#') ? href : undefined}
              onClick={href === 'marketplace' ? e => { e.preventDefault(); goTo('app', 'marketplace'); setOpen(false); } : () => setOpen(false)}>
              {label}
            </a>
          ))}
          <button className="pub-login" onClick={() => { goTo('login'); setOpen(false); }}>Log in</button>
          <button className="pub-cta" onClick={() => { goTo('signup'); setOpen(false); }}>
            Start free scan <ArrowRight size={14} />
          </button>
        </div>
        <button className="pub-hamburger" onClick={() => setOpen(v => !v)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </nav>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero({ goTo }) {
  return (
    <section className="hp-hero" style={{ backgroundImage: `url(${IMGS.hero})` }}>
      <div className="hp-hero-overlay" />
      <div className="hp-hero-content">
        <div className="hp-hero-left">
          <div className="hp-eyebrow">🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scotland-first · Standards-aligned · Trusted mediator</div>
          <h1 className="hp-h1">
            The people who own<br />
            the land cannot access<br />
            the markets built for it.
          </h1>
          <p className="hp-sub">
            OHMC CarbonOS is first-mile infrastructure for UK land-based carbon markets.
            We connect small landowners, farmers and crofters to the Woodland Carbon Code
            and Peatland Code — with real satellite screening, standards-bound assessment
            and verified buyer matching.
          </p>
          <div className="hp-actions">
            <button className="hp-btn-primary" onClick={() => goTo('signup')}>
              Scan My Land Free <ArrowRight size={16} />
            </button>
            <button className="hp-btn-outline-green" onClick={() => goTo('app', 'marketplace')}>
              Browse Projects
            </button>
          </div>
          <div className="hp-trust-strip">
            {['Woodland Carbon Code', 'Peatland Code', 'IUCN UK', 'UK Land Carbon Registry', 'Sentinel-2 MRV'].map(l => (
              <span key={l}><CheckCircle size={13} />{l}</span>
            ))}
          </div>
          <div className="hp-hero-disclaimer">
            <AlertTriangle size={12} />
            Platform estimates are preliminary only — not verified credits. Independent VVB validation required before any official claim.
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Market Stats ──────────────────────────────────────────────────────────────
function MarketStats() {
  return (
    <section className="hp-stats">
      {[
        { value: '£617M',    label: 'Scottish WCC pipeline value',    sub: 'Lifetime gross (WCC stats + £26.85/t)' },
        { value: '£26.85',   label: 'Avg WCC PIU price per tonne',    sub: 'vs global avg $6.37 — 4× premium' },
        { value: '1.4M ha',  label: 'Degraded Scottish peatland',     sub: '250,000 ha target by 2030' },
        { value: '~80%',     label: 'UK carbon is in Scotland',       sub: 'By registered WCC hectares' },
      ].map(({ value, label, sub }) => (
        <div key={label} className="hp-stat">
          <strong>{value}</strong>
          <p>{label}</p>
          <small>{sub}</small>
        </div>
      ))}
    </section>
  );
}

// ── Gallery ───────────────────────────────────────────────────────────────────
function LandGallery() {
  const labels = ['Aerial Farmland', 'Native Woodland', 'Upland Moors', 'Highland Hills', 'Pine Forest', 'Peatland'];
  return (
    <div className="hp-gallery">
      {IMGS.gallery.map((src, i) => (
        <div key={i} className="hp-gallery-item" style={{ backgroundImage: `url(${src})` }}>
          <span className="hp-gallery-label">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

// ── The Problem ───────────────────────────────────────────────────────────────
function Problem() {
  return (
    <section className="hp-section" id="problem">
      <div className="hp-section-inner">
        <div className="hp-section-head">
          <p className="hp-label">The access problem</p>
          <h2>Carbon markets are locked.<br />We open them.</h2>
          <p className="hp-body" style={{ maxWidth: 600, margin: '0 auto' }}>
            The route from raw land to a saleable credit is long, fragmented and expensive.
            Fixed validation costs make small projects sub-scale — not because the land isn't suitable,
            but because the economics don't work without infrastructure to bundle and automate them.
          </p>
        </div>

        <div className="prob-grid">
          {[
            {
              icon: Lock,
              title: 'High market-entry costs',
              body: 'WCC validation alone costs thousands of pounds per project — well above the break-even point for parcels under ~20 ha. Most small landowners never start.',
              stat: '£10,000+', statLabel: 'WCC validation cost',
            },
            {
              icon: AlertTriangle,
              title: 'Trust and integrity crisis',
              body: '94% of rainforest credits examined by The Guardian / Die Zeit investigation delivered no real climate benefit. Buyers now demand verifiable, domestic supply.',
              stat: '94%', statLabel: 'of rainforest credits = phantom',
            },
            {
              icon: FileText,
              title: 'Information asymmetry',
              body: "Landowners don't know if their land qualifies, which standard applies, what documentation is needed, or which verifier to approach. We solve this with one scan.",
              stat: '9 steps', statLabel: 'from land to verified credit',
            },
          ].map(({ icon: Icon, title, body, stat, statLabel }) => (
            <div key={title} className="prob-card">
              <div className="prob-card-icon"><Icon size={18} /></div>
              <div className="prob-card-stat">{stat}<small>{statLabel}</small></div>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────
function HowItWorks({ goTo }) {
  return (
    <section className="hp-section hp-alt" id="how">
      <div className="hp-section-inner">
        <div className="hp-section-head">
          <p className="hp-label">How CarbonOS works</p>
          <h2>From raw land to carbon income — four steps.</h2>
          <p className="hp-body" style={{ maxWidth: 560, margin: '0 auto' }}>
            Each step is independently valuable. You don't have to commit to the full journey to benefit.
          </p>
        </div>

        <div className="hp-steps-v2">
          {[
            {
              n: '01', icon: Map,
              title: 'Draw your boundary',
              body: 'Use our interactive map to outline your land parcel. We instantly pull real Sentinel-2 satellite data (10m resolution), soil carbon readings and land cover classification — no site visit needed.',
              tag: 'Free',
            },
            {
              n: '02', icon: ShieldCheck,
              title: 'Receive your assessment',
              body: 'Our rules engine checks your land against WCC and Peatland Code criteria. You get an eligibility classification (go / investigate / no-go), indicative carbon value range and confidence band — never a single false-precision figure.',
              tag: 'Free',
            },
            {
              n: '03', icon: FileText,
              title: 'Build your evidence pack',
              body: 'We generate a structured evidence pack and route you to approved VVBs, ecologists and labs. Every step is tracked. Platform estimates are screening outputs only — independent validation remains mandatory.',
              tag: 'Paid',
            },
            {
              n: '04', icon: Handshake,
              title: 'Connect with buyers',
              body: 'Once independently validated, your project appears in our curated marketplace with clear trust labels. Buyers receive serialised retirement and reporting evidence. OHMC acts as trusted mediator — never as a credit issuer.',
              tag: 'Commission',
            },
          ].map(({ n, icon: Icon, title, body, tag }) => (
            <div key={n} className="hp-step-v2">
              <div className="hp-step-header">
                <div className="hp-step-num-badge">{n}</div>
                <span className="hp-step-tag">{tag}</span>
                <div className="hp-step-icon"><Icon size={18} /></div>
              </div>
              <div className="hp-step-body">
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="hp-center-action">
          <button className="hp-btn-primary" onClick={() => goTo('signup')}>
            Start your free scan <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Three User Journeys ───────────────────────────────────────────────────────
function UserJourneys({ goTo }) {
  return (
    <section className="hp-section" id="landowners">
      <div className="hp-section-inner">
        <div className="hp-section-head">
          <p className="hp-label">Three user journeys, one platform</p>
          <h2>OHMC is the trusted mediator between all sides of the market.</h2>
        </div>

        <div className="journey-grid">
          {/* Landowner */}
          <div className="journey-card landowner">
            <div className="journey-card-header">
              <div className="journey-icon"><Leaf size={20} /></div>
              <div>
                <span className="journey-tag">For Landowners &amp; Farmers</span>
                <h3>Discover what your land is worth to the carbon market.</h3>
              </div>
            </div>
            <p>Whether you own peatland in Sutherland or a woodland in Perthshire, OHMC tells you in minutes whether you qualify, which standard fits, and what you could realistically earn — at no upfront cost.</p>
            <ul className="journey-list">
              {[
                'Free eligibility scan with real Sentinel-2 satellite data',
                'WCC and Peatland Code assessment with confidence bands',
                'Indicative carbon value range — not a guaranteed price',
                'Auto-generated evidence pack and approved VVB routing',
                'Project tracker from scan to first sale',
              ].map(f => <li key={f}><CheckCircle size={13} />{f}</li>)}
            </ul>
            <button className="journey-btn primary" onClick={() => goTo('signup')}>
              Check my land <ArrowRight size={14} />
            </button>
          </div>

          {/* Buyer */}
          <div className="journey-card buyer">
            <div className="journey-card-header">
              <div className="journey-icon buyer"><BarChart3 size={20} /></div>
              <div>
                <span className="journey-tag buyer">For Corporate Buyers &amp; ESG Teams</span>
                <h3>Source high-integrity UK carbon supply you can stand behind.</h3>
              </div>
            </div>
            <p>Post-2021, undifferentiated credits are a reputational liability. OHMC curates pre-screened domestic projects with clear trust labels, retirement evidence and claim guidance aligned to Science Based Targets.</p>
            <ul className="journey-list">
              {[
                'Curated UK domestic project listings (WCC + Peatland Code)',
                'Trust labels: exactly what you can and cannot claim',
                'Due diligence pack on request',
                'Serialised retirement and scope 3 claim evidence',
                'UK units at £26.85/t avg — 4× global voluntary average',
              ].map(f => <li key={f}><CheckCircle size={13} />{f}</li>)}
            </ul>
            <button className="journey-btn" onClick={() => goTo('app', 'marketplace')}>
              Browse marketplace <ArrowRight size={14} />
            </button>
          </div>

          {/* Partner VVB */}
          <div className="journey-card partner">
            <div className="journey-card-header">
              <div className="journey-icon partner"><Users size={20} /></div>
              <div>
                <span className="journey-tag partner">For VVBs, Ecologists &amp; Labs</span>
                <h3>Receive a pipeline of pre-screened projects ready for validation.</h3>
              </div>
            </div>
            <p>CarbonOS pre-screens projects and generates structured evidence packs before they reach your desk — cutting your review time and improving submission quality from day one.</p>
            <ul className="journey-list">
              {[
                'Pre-screened project pipeline with satellite data and maps',
                'Structured evidence pack per project — no cold starts',
                'Collaboration portal with tracked non-conformances',
                'Standards-bound: WCC v2.1 and Peatland Code v1.1',
                'Referral fee on successful project onboarding',
              ].map(f => <li key={f}><CheckCircle size={13} />{f}</li>)}
            </ul>
            <button className="journey-btn" onClick={() => goTo('signup')}>
              Join as partner <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Standards ─────────────────────────────────────────────────────────────────
function Standards() {
  return (
    <section className="hp-section hp-alt">
      <div className="hp-section-inner">
        <div className="hp-section-head">
          <p className="hp-label">Integrity by design</p>
          <h2>Built on UK recognised standards.<br />Never a black box.</h2>
          <p className="hp-body" style={{ maxWidth: 600, margin: '0 auto' }}>
            CarbonOS uses a deterministic, standards-bound rules engine — not AI — to
            quantify anything credit-relevant. Machine learning estimates, prioritises and flags.
            Independent VVBs validate and verify. Always.
          </p>
        </div>

        <div className="std-grid">
          <div className="std-card">
            <div className="std-badge wcc">WCC</div>
            <h4>Woodland Carbon Code</h4>
            <p>Governs woodland-creation projects. Validation confirms expected sequestration claims; verification converts PIUs into tradable WCUs on the UK Land Carbon Registry.</p>
            <div className="std-detail">
              <span>PIUs → WCUs on verification</span>
              <span>Validated by approved VVBs</span>
            </div>
          </div>
          <div className="std-card">
            <div className="std-badge peat">PC</div>
            <h4>Peatland Code</h4>
            <p>Governs peatland restoration (IUCN UK). All projects must be independently validated and verified by OF&G, Soil Association or other approved bodies. Scotland holds ~80% of UK eligible peatland.</p>
            <div className="std-detail">
              <span>1.4M ha degraded in Scotland</span>
              <span>250,000 ha target by 2030</span>
            </div>
          </div>
          <div className="std-card">
            <div className="std-badge reg">UKLCR</div>
            <h4>UK Land Carbon Registry</h4>
            <p>PIUs represent potential future sequestration only. They cannot be used, retired, reported or listed on an exchange. This PIU/verified credit distinction is the most important compliance fact on the platform.</p>
            <div className="std-detail">
              <span>PIUs ≠ verified credits</span>
              <span>Registry-linked audit trail</span>
            </div>
          </div>
          <div className="std-card">
            <div className="std-badge data">S2</div>
            <h4>Sentinel-2 MRV Data</h4>
            <p>Real Sentinel-2 L2A imagery at 10m resolution processed live over your boundary. NDVI, NDWI, soil moisture — authoritative open data from ESA Copernicus, not estimates from a database.</p>
            <div className="std-detail">
              <span>10m resolution, 5-day revisit</span>
              <span>ESA / Copernicus open data</span>
            </div>
          </div>
        </div>

        <div className="std-disclaimer">
          <AlertTriangle size={14} />
          Platform estimates are preliminary screening outputs and do not constitute certified carbon credits, investment advice or guaranteed revenue.
          Official credit issuance requires independent validation and verification by an accredited VVB under the relevant UK standard.
        </div>
      </div>
    </section>
  );
}

// ── Market Opportunity ────────────────────────────────────────────────────────
function MarketOpportunity() {
  return (
    <section className="hp-section">
      <div className="hp-section-inner">
        <div className="hp-section-head">
          <p className="hp-label">The market gap we target</p>
          <h2>Capital has gone to buyers.<br />Not to the landowners who hold the supply.</h2>
        </div>
        <div className="opp-grid">
          <div className="opp-left">
            <p className="hp-body">
              The global voluntary carbon market was valued at <strong>$1.4 billion in 2024</strong>, projected
              to reach $7–35 billion by 2030. UK code-linked units trade at <strong>£26.85/t</strong> — four times
              the global voluntary average of $6.37.
            </p>
            <p className="hp-body">
              Yet the capital has concentrated in buyer-facing ratings and analytics firms — not in
              landowner-facing origination. BeZero Carbon and Sylvera have each raised &gt;$100M.
              The integrated, trusted, jargon-free mediator for fragmented small landowners is
              structurally under-built.
            </p>
            <p className="hp-body">
              <strong>That is the gap CarbonOS targets.</strong>
            </p>
            <div className="opp-stats">
              {[
                ['$1.4bn', 'Global VCM 2024'],
                ['$35bn+', 'Projected 2030 high'],
                ['£617M', 'Scottish WCC pipeline'],
                ['78%', 'Gross margin on paid report'],
              ].map(([v, l]) => (
                <div key={l} className="opp-stat">
                  <strong>{v}</strong><span>{l}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="opp-right">
            <div className="opp-revenue-card">
              <p className="hp-label" style={{ marginBottom: 16 }}>Revenue model</p>
              {[
                ['Free scan',                 'Landowner',        'Free — lead generation'],
                ['Eligibility report',         'Landowner/estate', '£99 – £499'],
                ['Project onboarding package', 'Developer',        '£1,500 – £7,500'],
                ['Partner referral fee',       'VVB / lab',        '5–15%'],
                ['Success fee',                'Landowner',        '3–10% of sale'],
                ['Marketplace commission',     'Buyer / seller',   '2–8% of transaction'],
                ['Monitoring subscription',    'Landowner / buyer','£20–£250 / month'],
                ['ESG portfolio dashboard',    'Corporate buyer',  '£500–£5,000 / year'],
              ].map(([stream, customer, price]) => (
                <div key={stream} className="opp-rev-row">
                  <div>
                    <strong>{stream}</strong>
                    <span>{customer}</span>
                  </div>
                  <span className="opp-rev-price">{price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Roadmap ───────────────────────────────────────────────────────────────────
function Roadmap() {
  const phases = [
    { phase: 'Phase 1', time: '0–3 mo',  title: 'Eligibility Scanner',   status: 'live',   items: ['Boundary drawing', 'Satellite screening', 'WCC + Peatland rules', 'Carbon estimate'] },
    { phase: 'Phase 2', time: '3–6 mo',  title: 'Paid Reports + Partners', status: 'next',  items: ['Paid eligibility report', 'Evidence pack generator', 'VVB partner routing', 'Document vault'] },
    { phase: 'Phase 3', time: '6–12 mo', title: 'Certification Workflow', status: 'future', items: ['MRV workbench', 'VVB collaboration portal', 'Registry connector (UKLCR)', 'Verification tracking'] },
    { phase: 'Phase 4', time: '12–24 mo',title: 'Buyer Marketplace',      status: 'future', items: ['Curated project listings', 'Buyer due diligence packs', 'Retirement evidence', 'ESG dashboard'] },
    { phase: 'Phase 5', time: '24+ mo',  title: 'Consumer Wallet',        status: 'gated',  items: ['Gated by policy + regulation', 'Verified supply must exist first', 'Infrastructure → wallet', 'Never the reverse'] },
  ];

  return (
    <section className="hp-section hp-alt">
      <div className="hp-section-inner">
        <div className="hp-section-head">
          <p className="hp-label">Product roadmap</p>
          <h2>Infrastructure first. Wallet last.</h2>
          <p className="hp-body" style={{ maxWidth: 560, margin: '0 auto' }}>
            OHMC begins with eligibility and MRV — the parts the market has never built for small landowners.
            The consumer carbon wallet arrives only after verified supply, buyer trust and policy clarity exist.
          </p>
        </div>
        <div className="roadmap-grid">
          {phases.map(({ phase, time, title, status, items }) => (
            <div key={phase} className={`roadmap-card ${status}`}>
              <div className="roadmap-card-head">
                <span className="roadmap-phase">{phase}</span>
                <span className="roadmap-time">{time}</span>
                <span className={`roadmap-status ${status}`}>
                  {status === 'live' ? 'Live now' : status === 'next' ? 'Next' : status === 'gated' ? 'Policy-gated' : 'Planned'}
                </span>
              </div>
              <h4>{title}</h4>
              <ul>
                {items.map(i => <li key={i}><span />{i}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────
function CTA({ goTo }) {
  return (
    <section className="hp-cta-section">
      <div className="hp-section-inner hp-cta-inner">
        <p className="hp-label">Get started — free</p>
        <h2>Ready to find out if your land qualifies?</h2>
        <p>Draw a boundary. Get a real satellite-backed assessment. No commitment. No cost. No jargon.</p>
        <div className="hp-cta-actions">
          <button className="hp-btn-primary" onClick={() => goTo('signup')}>
            Start free scan <ArrowRight size={16} />
          </button>
          <button className="hp-btn-outline-dark" onClick={() => goTo('login')}>
            Sign in to your account
          </button>
        </div>
        <p className="hp-cta-disclaimer">
          Platform estimates are preliminary only and do not constitute verified carbon credits, investment advice or guaranteed revenue.
          CarbonOS acts as a trusted mediator only — it does not issue, certify or underwrite carbon credits.
        </p>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer({ goTo }) {
  const cols = [
    { title: 'Platform',   links: ['How It Works', 'Eligibility Scanner', 'Evidence Pack', 'Marketplace', 'Partner Portal'] },
    { title: 'Standards',  links: ['Woodland Carbon Code', 'Peatland Code', 'UK Land Carbon Registry', 'ICVCM Principles'] },
    { title: 'Resources',  links: ['Research Paper', 'Carbon Standards Guide', 'MRV Workflow', 'Help Centre'] },
    { title: 'Company',    links: ['About OHMC', 'Careers', 'Press', 'Contact', 'Privacy Policy'] },
  ];
  return (
    <footer className="hp-footer">
      <div className="hp-footer-top">
        <div className="hp-footer-brand">
          <img src={logoImg} alt="OHMC" className="hp-footer-logo" />
          <p>Trusted first-mile infrastructure for UK land-based carbon markets. Connecting landowners, verifiers and buyers with integrity.</p>
          <div className="hp-footer-badges">
            {['WCC', 'Peatland Code', 'IUCN UK', 'MRV Enabled'].map(b => <span key={b}>{b}</span>)}
          </div>
        </div>
        {cols.map(({ title, links }) => (
          <div key={title} className="hp-footer-col">
            <h5>{title}</h5>
            {links.map(l => <a key={l} href="#" onClick={e => e.preventDefault()}>{l}</a>)}
          </div>
        ))}
      </div>
      <div className="hp-footer-legal">
        <p>© OHMC 2026. All rights reserved. Registered in Scotland.</p>
        <p>Platform estimates are preliminary screening outputs only and do not constitute certified carbon credits, investment advice, legal advice or guaranteed revenue. Official credit issuance requires independent validation and verification by an accredited VVB under the relevant UK voluntary carbon standard. OHMC acts solely as a trusted mediator and does not issue, certify or underwrite carbon credits. PIUs (Pending Issuance Units) cannot be used, retired, reported or listed on an exchange under UK Land Carbon Registry rules.</p>
      </div>
    </footer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage({ goTo }) {
  return (
    <div className="hp-root">
      <PublicNav goTo={goTo} />
      <Hero goTo={goTo} />
      <MarketStats />
      <LandGallery />
      <Problem />
      <HowItWorks goTo={goTo} />
      <UserJourneys goTo={goTo} />
      <Standards />
      <MarketOpportunity />
      <Roadmap />
      <CTA goTo={goTo} />
      <Footer goTo={goTo} />
    </div>
  );
}
