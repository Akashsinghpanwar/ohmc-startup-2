import { useState, useEffect } from 'react';
import logoImg from '../assets/logo.png';
import {
  ArrowRight, CheckCircle, Map, ShieldCheck, FileText,
  Handshake, Menu, X, AlertTriangle,
  Leaf, Users, Building2, PencilLine, SatelliteDish, PoundSterling,
  ExternalLink, TrendingUp
} from 'lucide-react';
import { checkHealth } from '../services/api.js';

// ── Nav ───────────────────────────────────────────────────────────────────────
function PublicNav({ goTo }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const links = [
    ['How it works', '#how'],
    ["Who it's for", '#who'],
    ['Standards', '#standards'],
  ];

  return (
    <nav className={`pub-nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="pub-nav-inner">
        <button className="pub-logo" onClick={() => goTo('home')}>
          <img src={logoImg} alt="OHMC" />
          <span>CarbonOS</span>
        </button>

        <div className={`pub-links ${open ? 'open' : ''}`}>
          {links.map(([label, href]) => (
            <a key={label} className="pub-link" href={href} onClick={() => setOpen(false)}>
              {label}
            </a>
          ))}
          <a
            className="pub-link"
            href="#marketplace"
            onClick={e => { e.preventDefault(); goTo('app', 'marketplace'); setOpen(false); }}
          >
            Marketplace
          </a>
          <div className="pub-nav-spacer" />
          <button className="btn btn-ghost" onClick={() => { goTo('login'); setOpen(false); }}>
            Sign in
          </button>
          <button className="btn btn-primary" onClick={() => { goTo('signup'); setOpen(false); }}>
            Check my land — free
          </button>
        </div>

        <button className="pub-burger" onClick={() => setOpen(v => !v)} aria-label="Menu">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
    </nav>
  );
}

// ── Market data strip — real sourced numbers ──────────────────────────────────
function MarketDataBar() {
  const stats = [
    {
      value: '£26.85',
      unit: '/tCO₂e',
      label: 'UK WCC average PIU price',
      source: 'WCC Annual Report 2024',
      href: 'https://www.woodlandcarboncode.org.uk',
    },
    {
      value: '1.4M',
      unit: ' ha',
      label: 'degraded UK peatland',
      source: 'IUCN UK Peatland Programme',
      href: 'https://www.iucn-uk-peatlandprogramme.org',
    },
    {
      value: '4×',
      unit: '',
      label: 'UK vs global carbon price',
      source: 'VCMI 2024',
      href: 'https://vcmintegrity.org',
    },
    {
      value: '80%',
      unit: '',
      label: 'eligible land is in Scotland',
      source: 'UK Peatland Code',
      href: 'https://www.peatlandcode.org.uk',
    },
  ];

  return (
    <div className="hp-market-bar">
      <div className="hp-market-bar-inner">
        <div className="hp-market-bar-label">
          <TrendingUp size={13} />
          Live market context
        </div>
        {stats.map(({ value, unit, label, source, href }) => (
          <div key={label} className="hp-market-stat">
            <div className="hp-market-stat-num">
              {value}<span>{unit}</span>
            </div>
            <div className="hp-market-stat-label">{label}</div>
            <a
              className="hp-market-stat-source"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {source} <ExternalLink size={9} />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Hero — full width, no fake data ──────────────────────────────────────────
function Hero({ goTo }) {
  return (
    <section className="hp-hero" id="product">
      <div className="hp-hero-center">
        <div className="hp-eyebrow">
          <span className="hp-eyebrow-dot" />
          For UK farmers, crofters and estates
        </div>
        <h1>
          Find out what your land<br />
          <span>is worth in carbon —</span><br />
          free, in 60 seconds.
        </h1>
        <p className="hp-hero-lead">
          OHMC CarbonOS runs a live Sentinel-2 satellite scan and SoilGrids soil analysis
          on your exact boundary, then checks every rule of the Woodland Carbon Code
          and Peatland Code to give you an eligibility score and value range. No guesses.
          No consultants. No cost for your first answer.
        </p>
        <div className="hp-actions">
          <button className="btn btn-primary btn-lg" onClick={() => goTo('signup')}>
            Check my land — free <ArrowRight size={15} />
          </button>
          <a className="btn btn-secondary btn-lg" href="#how">
            How it works
          </a>
        </div>
        <div className="hp-trust">
          {[
            'Woodland Carbon Code',
            'Peatland Code',
            'ESA Sentinel-2',
            'SoilGrids / ISRIC',
          ].map(l => (
            <span key={l}><CheckCircle size={13} /> {l}</span>
          ))}
        </div>
      </div>
      <MarketDataBar />
    </section>
  );
}

// ── 3-step explainer strip ────────────────────────────────────────────────────
function ExplainerStrip() {
  const steps = [
    {
      icon: PencilLine,
      title: 'Draw your land',
      body: 'Trace your field, moor or woodland on a satellite map. No paperwork, no site visit, no cost.',
    },
    {
      icon: SatelliteDish,
      title: 'We run the checks',
      body: 'Live Sentinel-2 imagery, SoilGrids soil data and UK scheme rules are applied to your exact boundary.',
    },
    {
      icon: PoundSterling,
      title: 'Get your number',
      body: 'An eligibility score out of 100, a value range in pounds, and a full PDF report to keep.',
    },
  ];
  return (
    <section className="hp-explainer" id="steps">
      <div className="hp-explainer-inner">
        {steps.map(({ icon: Icon, title, body }, i) => (
          <div key={title} className="hp-explainer-step">
            <div className="hp-explainer-icon"><Icon size={19} /></div>
            <div>
              <h3><span>{i + 1}.</span> {title}</h3>
              <p>{body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── How it works — step-by-step ───────────────────────────────────────────────
function StepVisual({ step }) {
  if (step === 0) return (
    <div className="how-visual">
      <svg viewBox="0 0 360 200" xmlns="http://www.w3.org/2000/svg">
        <rect width="360" height="200" fill="#ddf0c8" rx="8" />
        <path d="M0 60 C80 48 150 76 230 64 C290 56 330 68 360 60 L360 0 L0 0 Z" fill="#c8e6b0" />
        <g fill="none" stroke="#1a3d20" strokeOpacity="0.12" strokeWidth="0.9">
          <path d="M0 110 C90 98 180 126 270 112 S340 96 360 104" />
          <path d="M0 168 C100 158 190 184 280 170 S345 154 360 162" />
        </g>
        <path d="M70 130 L130 80 L200 100 L260 62 L320 88 L325 134 L250 150 L170 142 L110 156 Z"
          fill="#1a3d20" fillOpacity="0.13" stroke="#1a3d20" strokeWidth="2" strokeLinejoin="round" strokeDasharray="7 5" />
        {[[130, 80], [200, 100], [260, 62], [320, 88], [325, 134], [250, 150], [170, 142], [110, 156], [70, 130]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="4.5" fill={i === 0 ? '#1a3d20' : '#fff'} stroke="#1a3d20" strokeWidth="2" />
        ))}
        <rect x="12" y="12" width="134" height="26" rx="5" fill="#fff" stroke="#c8e6b0" />
        <text x="22" y="29" fill="#1a3d20" fontSize="12" fontFamily="Inter, sans-serif">Click to add points…</text>
      </svg>
    </div>
  );
  if (step === 1) return (
    <div className="how-visual how-visual-panel">
      <div className="how-mock-score">
        <span className="badge badge-green">Likely eligible</span>
        <div>
          <h5>Peatland Code pathway</h5>
          <p>Confidence: high · a preliminary estimate, not a verified credit</p>
        </div>
      </div>
      {[
        ['Eligible area meets the code minimum', true],
        ['Peat or peaty soil present', true],
        ['Degraded condition — restoration additional', true],
        ['Not already woodland', true],
        ['No registry overlap or double-counting', true],
      ].map(([rule, pass]) => (
        <div key={rule} className={`how-mock-rule ${pass ? 'pass' : 'fail'}`}>
          <span>{pass ? '✓' : '✕'}</span> {rule}
        </div>
      ))}
      <p style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 8 }}>
        A go / investigate / no-go decision against the Woodland Carbon Code and
        Peatland Code — with a value range and confidence, never a false-precise number.
      </p>
    </div>
  );
  if (step === 2) return (
    <div className="how-visual how-visual-panel">
      <div className="how-mock-doc">
        <div className="how-mock-doc-head">
          <FileText size={16} />
          <div>
            <strong>Evidence pack</strong>
            <span>Structured for an approved verifier</span>
          </div>
          <span className="mock-chip">PDF</span>
        </div>
        {[
          'Boundary map and coordinates',
          'Sentinel-2 indices: NDVI, NDWI, bare-soil',
          'Soil baseline and land-cover context',
          'Rule-by-rule pass/fail with reason codes',
          'Value range with assumptions and confidence',
          'Site-risk notes and partner next steps',
        ].map(line => (
          <div key={line} className="how-mock-doc-row"><CheckCircle size={13} /> {line}</div>
        ))}
      </div>
    </div>
  );
  return (
    <div className="how-visual how-visual-panel">
      {[
        ['Peatland restoration', 'Pending verification', 'amber'],
        ['Native woodland creation', 'Validated — PIUs', 'blue'],
        ['Peatland units', 'Verified — sellable', 'green'],
      ].map(([title, status, tone]) => (
        <div key={title} className="how-mock-listing">
          <div>
            <strong>{title}</strong>
            <span>Pre-screened · evidence-backed · Scotland</span>
          </div>
          <span className={`badge badge-${tone}`}>{status}</span>
        </div>
      ))}
      <div className="how-mock-buyer">
        <Building2 size={14} /> PIUs aren't sellable credits until independently verified
      </div>
    </div>
  );
}

// ── Decorative animated valley band (ink line-art, gazette style) ──────────────
function LandscapeBand() {
  const trees = [
    [165, 151], [232, 157], [292, 151],
    [812, 139], [862, 133], [908, 141], [955, 134],
    [1048, 150],
  ];
  return (
    <div className="hp-landscape" aria-hidden="true">
      <svg viewBox="0 0 1200 200" preserveAspectRatio="xMidYMax meet" xmlns="http://www.w3.org/2000/svg">
        {/* drifting birds */}
        <g stroke="var(--ink)" strokeWidth="1.4" fill="none" strokeLinecap="round">
          <g className="lb-bird" style={{ '--by': '36px', animationDelay: '0s' }}>
            <path d="M0 0 Q5 -4 10 0 Q15 -4 20 0" />
          </g>
          <g className="lb-bird" style={{ '--by': '54px', animationDelay: '6s' }}>
            <path d="M0 0 Q4 -3 8 0 Q12 -3 16 0" />
          </g>
          <g className="lb-bird" style={{ '--by': '26px', animationDelay: '12s' }}>
            <path d="M0 0 Q5 -4 10 0 Q15 -4 20 0" />
          </g>
        </g>

        {/* layered hills */}
        <path d="M0 120 C120 100 240 108 360 112 C520 118 680 96 840 108 C980 118 1100 104 1200 110 L1200 200 L0 200 Z" fill="var(--ink)" opacity="0.06" />
        <path d="M0 150 C160 132 300 146 460 148 C640 150 780 134 960 146 C1080 154 1140 146 1200 150 L1200 200 L0 200 Z" fill="var(--ink)" opacity="0.10" />

        {/* winding river */}
        <path d="M556 116 C548 148 604 168 590 200 L648 200 C636 170 612 150 612 116 Z" fill="#3f8a86" opacity="0.28" />
        <path className="lb-river" d="M584 118 C576 150 626 170 614 198" stroke="#eafff7" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="6 12" opacity="0.6" />

        {/* foreground hill (river runs behind it) */}
        <path d="M0 178 C200 166 360 182 560 180 C760 178 900 186 1080 180 C1140 178 1170 180 1200 180 L1200 200 L0 200 Z" fill="var(--ink)" opacity="0.16" />

        {/* swaying conifers */}
        {trees.map(([x, y], i) => (
          <g key={i} className="lb-tree" style={{ animationDelay: `${(i % 4) * 0.7}s` }}>
            <rect x={x - 1.5} y={y - 7} width="3" height="9" fill="var(--ink)" opacity="0.5" />
            <path d={`M${x} ${y - 34} L${x + 11} ${y - 14} L${x - 11} ${y - 14} Z`} fill="var(--ink)" opacity="0.5" />
            <path d={`M${x} ${y - 24} L${x + 13} ${y - 4} L${x - 13} ${y - 4} Z`} fill="var(--ink)" opacity="0.5" />
          </g>
        ))}
      </svg>
    </div>
  );
}

function HowItWorks({ goTo }) {
  const steps = [
    {
      n: '1', icon: Map, title: 'Draw your boundary', tag: 'Free', tagCls: 'free',
      body: 'Open the map and click around your land. The moment you close the boundary, we pull live Sentinel-2 satellite imagery and SoilGrids soil data for that exact parcel — the same open data the European Space Agency and ISRIC World Soil Information publish.',
      points: [
        'Works for fields, moorland and woodland',
        'Sentinel-2 imagery at 10 m resolution, 5-day revisit',
        'No paperwork and no site visit — takes about 30 seconds',
      ],
    },
    {
      n: '2', icon: ShieldCheck, title: 'Get your assessment', tag: 'Free', tagCls: 'free',
      body: 'We apply the eligibility rules of the Woodland Carbon Code and Peatland Code to your land data. Every check shows a clear pass or fail with the specific rule it applies, so you see exactly why your land qualifies — or what is holding it back.',
      points: [
        'A go / investigate / no-go decision with a per-rule breakdown',
        'Value range in pounds with confidence — never a fake-precise single number',
        'Every check cites the scheme rule it applies',
      ],
    },
    {
      n: '3', icon: FileText, title: 'Download your evidence pack', tag: 'Paid', tagCls: 'paid',
      body: 'A professional evidence pack with your boundary map, satellite indices, soil baseline and value range — structured exactly as an approved verifier or land agent needs to start their review.',
      points: [
        'Boundary map with coordinates',
        'Raw Sentinel-2 indices and soil baseline',
        'Routing to approved Peatland Code and WCC verifiers',
      ],
    },
    {
      n: '4', icon: Handshake, title: 'Sell to verified buyers', tag: 'Commission', tagCls: 'commission',
      body: 'Once your project passes independent verification, it lists on our curated UK marketplace. Corporate buyers see the full verification chain — which is why UK carbon credits command around four times the global average price.',
      points: [
        'UK-only curated marketplace with verification proof',
        'Buyers receive retirement evidence for their ESG reports',
        'We earn commission only when you sell — no upfront fees',
      ],
    },
  ];

  return (
    <section className="hp-section hp-alt" id="how">
      <div className="hp-section-inner">
        <div className="hp-section-head">
          <p className="hp-label">How it works</p>
          <h2>What you get at each step</h2>
          <p className="hp-section-sub">
            From drawing your boundary to a buyer-ready project — with exact data sources
            and a clear breakdown of what's free and what's paid.
          </p>
        </div>

        <div className="how-stack">
          {steps.map(({ n, icon: Icon, title, tag, tagCls, body, points }, i) => (
            <div key={n} className={`how-row ${i % 2 === 1 ? 'flip' : ''}`}>
              <div className="how-row-text">
                <div className="how-row-meta">
                  <span className="how-row-n">Step {n}</span>
                  <span className={`how-step-tag ${tagCls}`}>{tag}</span>
                </div>
                <h3><Icon size={20} /> {title}</h3>
                <p>{body}</p>
                <ul className="how-detail-points">
                  {points.map(pt => (
                    <li key={pt}><CheckCircle size={14} />{pt}</li>
                  ))}
                </ul>
              </div>
              <StepVisual step={i} />
            </div>
          ))}
        </div>

        <div className="how-cta">
          <button className="btn btn-primary btn-lg" onClick={() => goTo('signup')}>
            Start with the free check <ArrowRight size={15} />
          </button>
        </div>

        <LandscapeBand />
      </div>
    </section>
  );
}

// ── The problem — with sourced stats ──────────────────────────────────────────
function Problem() {
  return (
    <section className="hp-section" id="problem">
      <div className="hp-section-inner">
        <div className="hp-section-head">
          <p className="hp-label">Why this matters</p>
          <h2>Why most land never earns carbon income</h2>
          <p className="hp-section-sub">
            Finding out used to cost £10,000+ and take 3–5 years. Your first answer
            here takes 60 seconds and costs nothing.
          </p>
        </div>

        <div className="prob-stats">
          {[
            ['£10,000+', 'typical cost of an initial feasibility study', 'Land carbon consultants, 2023'],
            ['3–5 years', 'the traditional route from first idea to first sale', 'WCC Project Developer Guide'],
            ['£26.85/t', 'UK WCC average Pending Issuance Unit price (2024)', 'WCC Annual Report 2024'],
            ['80%', 'of UK carbon-eligible land is in Scotland', 'IUCN UK / Peatland Code'],
          ].map(([num, label, source]) => (
            <div key={num} className="prob-stat">
              <strong>{num}</strong>
              <span>{label}</span>
              <small className="prob-stat-source">{source}</small>
            </div>
          ))}
        </div>

        <div className="prob-compare">
          <div className="prob-compare-col without">
            <div className="prob-compare-head">The old way</div>
            {[
              'Commission a land agent or consultant',
              'Ecological baseline survey (site visit)',
              'Write a Project Design Document',
              'Find an accredited verifier yourself',
              'Desk review and site validation visit',
              'Respond to validation queries',
              'Register on UK Land Carbon Registry',
              'Find corporate buyers yourself',
            ].map((s, i) => (
              <div key={i} className="prob-compare-row">
                <span className="prob-step-num">{i + 1}</span>
                <span>{s}</span>
              </div>
            ))}
            <div className="prob-compare-footer bad">Typically 3–5 years · £10,000+ before your first sale</div>
          </div>
          <div className="prob-compare-vs">vs</div>
          <div className="prob-compare-col with">
            <div className="prob-compare-head">With CarbonOS</div>
            {[
              ['Draw your boundary on the satellite map', '30 sec'],
              ['Sentinel-2 + SoilGrids check runs automatically', '45 sec'],
              ['Eligibility score and value range arrive', '60 sec'],
              ['Download your full evidence report', 'same day'],
              ['Evidence pack structured to scheme rule IDs', '1 week'],
              ['Introduced to approved verifiers', 'guided'],
              ['Project tracked to UK LCR registration', 'guided'],
              ['Matched with vetted corporate buyers', 'when verified'],
            ].map(([s, t], i) => (
              <div key={i} className="prob-compare-row">
                <CheckCircle size={13} />
                <span>{s}</span>
                <span className="prob-time">{t}</span>
              </div>
            ))}
            <div className="prob-compare-footer good">First answer in under 60 seconds · Free</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Who it's for ──────────────────────────────────────────────────────────────
function Audiences({ goTo }) {
  return (
    <section className="hp-section hp-alt" id="who">
      <div className="hp-section-inner">
        <div className="hp-section-head">
          <p className="hp-label">Who it's for</p>
          <h2>Who CarbonOS is for</h2>
          <p className="hp-section-sub">
            Landowners assess and sell. Companies buy high-integrity UK credits they
            can stand behind. Verifiers receive structured evidence instead of blank project files.
          </p>
        </div>

        <div className="aud-featured">
          <div className="aud-featured-body">
            <div className="aud-card-head">
              <span className="aud-icon"><Leaf size={17} /></span>
              <h3>Landowners &amp; farmers</h3>
            </div>
            <p>
              Whether you own peatland in Sutherland or a woodland in Perthshire, find out
              in minutes whether you qualify for the Woodland Carbon Code or Peatland Code,
              and what you could realistically earn — before spending a penny on consultants.
            </p>
            <button className="btn btn-primary" onClick={() => goTo('signup')}>
              Check my land — free <ArrowRight size={14} />
            </button>
          </div>
          <ul className="aud-featured-list">
            {[
              'Free live satellite check of your exact drawn boundary',
              'Assessment against both UK voluntary carbon schemes',
              'Honest value range with low/mid/high projections — not a sales pitch',
              'Professional PDF report structured for verifier review',
              'One tracker from first scan to first verified sale',
            ].map(f => (
              <li key={f}><CheckCircle size={14} />{f}</li>
            ))}
          </ul>
        </div>

        <div className="aud-grid">
          <div className="aud-card">
            <div className="aud-card-head">
              <span className="aud-icon"><Building2 size={16} /></span>
              <h3>Corporate buyers</h3>
            </div>
            <p>
              Buy high-integrity UK carbon credits with clear guidance on exactly what
              you can and cannot claim — with proof of every credit retired on the
              UK Land Carbon Registry in your name.
            </p>
            <ul>
              {[
                'Curated UK-only project listings',
                'Clear VCMI claim-level guidance on every project',
                'Full retirement certificate from UK LCR',
              ].map(f => (
                <li key={f}><CheckCircle size={13} />{f}</li>
              ))}
            </ul>
            <button className="btn btn-secondary" onClick={() => goTo('app', 'marketplace')}>
              Browse the marketplace <ArrowRight size={13} />
            </button>
          </div>

          <div className="aud-card">
            <div className="aud-card-head">
              <span className="aud-icon"><Users size={16} /></span>
              <h3>Verifiers &amp; partners</h3>
            </div>
            <p>
              Receive a pipeline of pre-screened projects with Sentinel-2 satellite data,
              SoilGrids baselines and evidence mapped to specific scheme rule IDs — no
              blank project files, no cold starts.
            </p>
            <ul>
              {[
                'Pre-screened projects with satellite + soil evidence attached',
                'Evidence indexed to WCC and Peatland Code rule references',
                'Referral fee on successful project onboarding',
              ].map(f => (
                <li key={f}><CheckCircle size={13} />{f}</li>
              ))}
            </ul>
            <button className="btn btn-secondary" onClick={() => goTo('app', 'partner')}>
              Join as a partner <ArrowRight size={13} />
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
    <section className="hp-section" id="standards">
      <div className="hp-section-inner">
        <div className="hp-section-head">
          <p className="hp-label">Integrity by design</p>
          <h2>Checked against the UK's official schemes</h2>
          <p className="hp-section-sub">
            Every assessment applies the Woodland Carbon Code and Peatland Code rules exactly.
            Independent verifiers always have the final word — we never certify our own results.
          </p>
        </div>

        <div className="std-grid">
          {[
            {
              badge: 'WCC', color: 'green',
              title: 'Woodland Carbon Code',
              body: 'The UK government-backed standard for woodland creation. Our eligibility checks apply its rules on land eligibility, additionality and carbon estimation — all confirmed by an independent verifier.',
              details: ['Government-backed standard · Forestry Commission', 'Independent validation required for PIU issuance'],
            },
            {
              badge: 'PC', color: 'amber',
              title: 'Peatland Code',
              body: 'The IUCN UK Peatland Programme standard for peatland restoration. Our checks apply its rules on peat presence, degraded condition and restoration additionality.',
              details: ['Most UK peatland is degraded (IUCN UK)', 'Restoring it earns independently verified carbon income'],
            },
            {
              badge: 'UK LCR', color: 'blue',
              title: 'UK Land Carbon Registry',
              body: 'The public register where every UK Pending Issuance Unit and Verified Carbon Unit is recorded. Until a credit is independently verified and registered, it cannot be sold as an offset.',
              details: ['Public, searchable register at uklcr.com', 'PIUs ≠ sellable credits until verified'],
            },
            {
              badge: 'ESA', color: 'violet',
              title: 'ESA Sentinel-2 (Copernicus)',
              body: 'Your boundary is checked with real Sentinel-2 MSI imagery at 10-metre resolution, refreshed every 5 days. We compute NDVI (vegetation), NDWI (water/peat), NBR (burn ratio) and EVI indices.',
              details: ['10 m resolution, 5-day revisit · Open Copernicus data', 'Paired with SoilGrids v2 soil chemistry (ISRIC)'],
            },
          ].map(({ badge, color, title, body, details }) => (
            <div key={title} className={`std-card ${color}`}>
              <div className={`std-badge ${color}`}>{badge}</div>
              <h4>{title}</h4>
              <p>{body}</p>
              <div className="std-details">
                {details.map(d => <span key={d}><CheckCircle size={12} />{d}</span>)}
              </div>
            </div>
          ))}
        </div>

        <div className="std-disclaimer">
          <AlertTriangle size={14} />
          Platform outputs are preliminary eligibility screening results, not certified carbon credits
          or guaranteed income. Credits can only be issued after independent validation and
          verification by an accredited body under the relevant UK voluntary carbon standard.
          Pending Issuance Units (PIUs) cannot be sold, retired, reported or listed until verified.
        </div>
      </div>
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────
function CTA({ goTo }) {
  return (
    <section className="hp-cta">
      <div className="hp-cta-inner">
        <div className="hp-cta-left">
          <p className="hp-label light">Get started — free</p>
          <h2>Find out what your land is worth.</h2>
          <p>
            Draw a boundary. Get a real Sentinel-2 satellite-backed eligibility answer
            in under a minute. No commitment, no cost, no jargon.
          </p>
          <div className="hp-cta-actions">
            <button className="btn btn-light btn-lg" onClick={() => goTo('signup')}>
              Check my land — free <ArrowRight size={15} />
            </button>
            <button className="btn btn-outline-light btn-lg" onClick={() => goTo('login')}>
              Sign in
            </button>
          </div>
        </div>
        <div className="hp-cta-card">
          <strong>What the scan delivers</strong>
          <div className="hp-cta-checklist">
            {[
              'Live Sentinel-2 vegetation &amp; moisture indices',
              'SoilGrids soil organic carbon, bulk density &amp; pH',
              'Rule-by-rule WCC + Peatland Code eligibility check',
              'Value range: low / mid / high projection with assumptions',
              'Downloadable PDF evidence report (paid)',
              'Introductions to approved verifiers (when eligible)',
            ].map(item => (
              <div key={item} className="hp-cta-check-row">
                <CheckCircle size={13} />
                <span dangerouslySetInnerHTML={{ __html: item }} />
              </div>
            ))}
          </div>
          <div className="hp-cta-disclaimer">
            <AlertTriangle size={11} />
            Preliminary screening only. Credits require independent verification.
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  const cols = [
    { title: 'Platform', links: ['How it works', 'Eligibility scanner', 'Evidence report', 'Marketplace', 'Partner programme'] },
    { title: 'Standards', links: ['Woodland Carbon Code', 'Peatland Code', 'UK Land Carbon Registry', 'VCMI principles'] },
    { title: 'Data sources', links: ['ESA Sentinel-2', 'SoilGrids (ISRIC)', 'OS National Grid', 'WCC Carbon tables'] },
    { title: 'Company', links: ['About OHMC', 'Careers', 'Press', 'Contact', 'Privacy policy'] },
  ];
  return (
    <footer className="hp-footer">
      <div className="hp-footer-top">
        <div className="hp-footer-brand">
          <div className="hp-footer-logo">
            <img src={logoImg} alt="OHMC" />
            <span>CarbonOS</span>
          </div>
          <p>Helping UK landowners access the voluntary carbon market honestly, against official standards.</p>
          <div className="hp-footer-badges">
            {['Woodland Carbon Code', 'Peatland Code', 'UK LCR', 'ESA Copernicus'].map(b => <span key={b}>{b}</span>)}
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
        <p>© OHMC {new Date().getFullYear()}. All rights reserved. Registered in Scotland.</p>
        <p>
          All platform outputs are preliminary eligibility screening results only and do not constitute
          certified carbon credits, investment advice, legal advice or guaranteed revenue. Official
          credit issuance requires independent validation and verification by an accredited verification
          body under the relevant UK voluntary carbon standard (Woodland Carbon Code v2.2 or Peatland
          Code v4.0). OHMC acts solely as a technology platform and trusted mediator; it does not issue,
          certify or underwrite carbon credits. Pending Issuance Units (PIUs) cannot be used, retired,
          reported or listed on an exchange under UK Land Carbon Registry rules until independently
          verified. Carbon price data is sourced from publicly available scheme reports and is for
          indicative purposes only.
        </p>
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
      <ExplainerStrip />
      <HowItWorks goTo={goTo} />
      <Problem />
      <Audiences goTo={goTo} />
      <Standards />
      <CTA goTo={goTo} />
      <Footer />
    </div>
  );
}
