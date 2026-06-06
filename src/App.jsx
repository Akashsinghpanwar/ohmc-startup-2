import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, CheckCircle, ChevronDown, CircleDollarSign,
  Download, FileCheck, FileText, Leaf, Map, MapPin,
  Plus, Settings, ShieldCheck, TrendingUp,
  Upload, Users, AlertTriangle, ArrowRight, Handshake,
  LineChart, Heart, Menu, X, Loader, LogOut
} from 'lucide-react';
import logoImg from './assets/logo.png';

import HomePage from './pages/HomePage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import BoundaryMap from './components/BoundaryMap.jsx';
import { scanBoundary, listMarketplace, checkHealth, getMe, getToken, setToken, clearToken, registerInterest } from './services/api.js';
import { generateEligibilityPDF } from './utils/generatePDF.js';

// ─── Single unified navigation — no roles ─────────────────────────────────────
const NAV = [
  { id: 'boundary',    label: 'Scan Land',      icon: Map },
  { id: 'eligibility', label: 'Eligibility',    icon: ShieldCheck },
  { id: 'report',      label: 'Carbon Report',  icon: FileText },
  { id: 'marketplace', label: 'Marketplace',    icon: BarChart3 },
  { id: 'partner',     label: 'Partner Portal', icon: Handshake },
];

const TRUST_CLS = {
  'Estimated Only': 'muted', 'Pre-Validation': 'warn',
  'Validated PIU': 'blue', 'Verified Credit': 'good', 'Retired': 'good',
};

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage]           = useState('home');
  const [user, setUser]           = useState(null);
  const [screen, setScreen]       = useState('boundary');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apiOnline, setApiOnline] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ── Restore session from stored token + handle Google OAuth callback ──────
  useEffect(() => {
    checkHealth().then(r => setApiOnline(!!r));

    // Handle Google OAuth callback: ?token=...&user_name=...&user_role=...
    const params = new URLSearchParams(window.location.search);
    const callbackToken = params.get('token');
    if (callbackToken) {
      setToken(callbackToken);
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Restore session if we have a stored token
    const token = getToken();
    if (token) {
      getMe()
        .then(u => { setUser(u); setPage('app'); })
        .catch(() => { clearToken(); })
        .finally(() => setAuthLoading(false));
    } else {
      setAuthLoading(false);
    }
  }, []);

  const goTo = useCallback((p, arg) => {
    setPage(p);
    if (p === 'app' && arg) setScreen(arg);
    setSidebarOpen(false);
    window.scrollTo(0, 0);
  }, []);

  const handleAuth = useCallback((userData) => {
    setUser(userData);
    const first = 'boundary';
    setScreen(first);
    setPage('app');
    window.scrollTo(0, 0);
  }, []);

  const handleLogout = useCallback(() => {
    clearToken();
    setUser(null);
    setPage('home');
    setScanResult(null);
    window.scrollTo(0, 0);
  }, []);

  if (authLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0f0d' }}>
      <Loader size={28} className="spin" style={{ color: '#22c55e' }} />
    </div>
  );

  if (page === 'home')   return <HomePage goTo={goTo} />;
  if (page === 'login')  return <AuthPage mode="login"  onAuth={handleAuth} goTo={goTo} />;
  if (page === 'signup') return <AuthPage mode="signup" onAuth={handleAuth} goTo={goTo} />;

  return (
    <AppShell
      user={user}
      screen={screen}
      setScreen={setScreen}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      apiOnline={apiOnline}
      scanResult={scanResult}
      setScanResult={setScanResult}
      goTo={goTo}
      logout={handleLogout}
    />
  );
}

// ─── App Shell (authenticated) ────────────────────────────────────────────────
function AppShell({ user, screen, setScreen, sidebarOpen, setSidebarOpen, apiOnline, scanResult, setScanResult, goTo, logout }) {
  const navigate = (id) => { setScreen(id); setSidebarOpen(false); window.scrollTo(0, 0); };

  const screens = {
    boundary:    <BoundaryScreen  setScreen={setScreen} setScanResult={setScanResult} />,
    eligibility: <EligibilityScreen setScreen={setScreen} scanResult={scanResult} />,
    report:      <ReportScreen    setScreen={setScreen} scanResult={scanResult} />,
    marketplace: <MarketplaceScreen setScreen={setScreen} />,
    project:     <ProjectDetail   setScreen={setScreen} user={user} />,
    partner:     <PartnerPortal   setScreen={setScreen} />,
    admin:       <AdminDashboard />,
  };

  return (
    <div className="appv2-shell">
      {/* Top navbar */}
      <header className="appv2-nav">
        <div className="appv2-nav-inner">
          {/* Logo */}
          <button className="appv2-logo" onClick={() => goTo('home')}>
            <img src={logoImg} alt="OHMC" className="appv2-logo-img" />
          </button>

          {/* Nav links — hidden on mobile */}
          <nav className="appv2-links">
            {NAV.map(({ id, label, icon: Icon }) => (
              <button key={id} className={`appv2-link ${screen === id ? 'active' : ''}`} onClick={() => navigate(id)}>
                <Icon size={14} />{label}
              </button>
            ))}
          </nav>

          {/* Right: api status + user + logout */}
          <div className="appv2-right">
            <div className={`appv2-status ${apiOnline === null ? 'unknown' : apiOnline ? 'online' : 'offline'}`}
              title={apiOnline ? 'API online' : 'API offline'} />
            <div className="appv2-user">
              <div className="appv2-avatar">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
              <div className="appv2-user-info">
                <span>{user?.name}</span>
                <small>OHMC Member</small>
              </div>
            </div>
            <button className="appv2-logout" onClick={logout} title="Sign out">
              <LogOut size={15} />
            </button>
          </div>

          {/* Mobile hamburger */}
          <button className="appv2-hamburger" onClick={() => setSidebarOpen(v => !v)}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile dropdown nav */}
        {sidebarOpen && (
          <div className="appv2-mobile-nav">
            {NAV.map(({ id, label, icon: Icon }) => (
              <button key={id} className={`appv2-mobile-link ${screen === id ? 'active' : ''}`} onClick={() => navigate(id)}>
                <Icon size={15} />{label}
              </button>
            ))}
            <button className="appv2-mobile-logout" onClick={logout}><LogOut size={14} /> Sign out</button>
          </div>
        )}
      </header>

      <main className="appv2-main">
        {screens[screen] || screens.boundary}
      </main>
    </div>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function PageHeader({ title, subtitle, action }) {
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

function Card({ title, children, className = '', action }) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <div className="card-header">
          <h3>{title}</h3>
          {action && <span className="card-action">{action}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

function StatRow({ label, value, badge, badgeCls }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      {badge
        ? <span className={`badge ${badgeCls || ''}`}>{value}</span>
        : <strong className="stat-value">{value}</strong>}
    </div>
  );
}

function Metric({ icon: Icon, label, value, note, accent }) {
  return (
    <div className={`metric-card ${accent ? 'accent' : ''}`}>
      <Icon size={20} className="metric-icon" />
      <p className="metric-label">{label}</p>
      <strong className="metric-value">{value}</strong>
      {note && <small className="metric-note">{note}</small>}
    </div>
  );
}

function Disclaimer() {
  return (
    <div className="disclaimer">
      <AlertTriangle size={14} />
      Preliminary screening estimates only — not verified credits or guaranteed revenue.
      Official credit issuance requires independent VVB validation.
    </div>
  );
}

function Spinner({ text = 'Loading…' }) {
  return (
    <div className="spinner-wrap">
      <Loader size={22} className="spin" /><span>{text}</span>
    </div>
  );
}

// ─── Seller / Landowner Dashboard ────────────────────────────────────────────
function SellerDashboard({ user, setScreen }) {
  return (
    <div className="page">
      <PageHeader
        title={`Welcome back, ${user?.name || 'Landowner'}`}
        subtitle="Here's the status of your land parcels and carbon projects."
        action={<button className="btn-primary" onClick={() => setScreen('boundary')}><Plus size={14} /> Scan New Land</button>}
      />

      <div className="metrics-row">
        <Metric icon={Map}        label="Land Parcels"    value="7"     note="2,345 ha total" accent />
        <Metric icon={Leaf}       label="Active Projects" value="3"     note="In progress" />
        <Metric icon={FileText}   label="Pending Docs"    value="5"     note="Action needed" />
        <Metric icon={Users}      label="Buyer Interest"  value="12"    note="Active enquiries" />
      </div>

      <Card title="Project Journey — Glenfinnan North">
        <p className="status-note">Current step: <strong>Evidence Pack In Progress</strong> · Step 4 of 11</p>
        <div className="tracker">
          {['Land Submitted','AI Screening','Report Generated','Evidence Pack','Partner Review','Validation','Pending Issuance','Monitoring','Verification','Listed','Sold'].map((s, i) => (
            <div key={s} className={`tracker-step ${i < 3 ? 'done' : i === 3 ? 'active' : ''}`}>
              <div className="tracker-dot">{i < 3 ? '✓' : i + 1}</div>
              <span>{s}</span>
            </div>
          ))}
        </div>
        <div className="btn-row">
          <button className="btn-outline" onClick={() => setScreen('report')}><FileText size={14} /> Carbon Report</button>
          <button className="btn-outline"><Upload size={14} /> Upload Docs</button>
          <button className="btn-outline" onClick={() => setScreen('partner')}>Partner Review</button>
        </div>
      </Card>

      <div className="two-col-grid">
        <Card title="Recent Parcels">
          <table className="data-table">
            <thead><tr><th>Parcel</th><th>Area</th><th>Status</th></tr></thead>
            <tbody>
              {[['Glenfinnan North','580 ha','Screening'],['Strath Dochart','320 ha','Report Ready'],
                ['Lochside Moor','410 ha','Awaiting Review'],['Auchnacraig Forest','615 ha','Pre-validation']].map(([name, area, status]) => (
                <tr key={name}>
                  <td>{name}</td><td>{area}</td>
                  <td><span className="badge badge-gray">{status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Evidence Checklist">
          {[['Land boundary (GIS)','done'],['Ownership / title proof','done'],['Soil baseline data','progress'],
            ['Stakeholder plan','missing'],['Verifier review','required']].map(([item, status]) => (
            <div key={item} className="checklist-row">
              <span>{item}</span>
              <span className={`badge ${status === 'done' ? 'badge-green' : status === 'progress' ? 'badge-amber' : 'badge-red'}`}>
                {status}
              </span>
            </div>
          ))}
          <button className="btn-outline" style={{ marginTop: 14, width: '100%', justifyContent: 'center' }}>
            <Upload size={14} /> Upload Documents
          </button>
        </Card>
      </div>

      <Card title="Next Steps">
        <div className="next-steps-grid">
          {[
            [FileCheck,  'Upload Ownership Proof',   'Submit title documents to verify your land.', () => {}],
            [LineChart,  'Request Carbon Report',     'Get your eligibility and carbon value estimate.', () => setScreen('report')],
            [Handshake,  'Book Partner Review',       'Schedule a review with an approved VVB.', () => setScreen('partner')],
          ].map(([Icon, title, text, action]) => (
            <div key={title} className="next-step-card" onClick={action} style={{ cursor: 'pointer' }}>
              <Icon size={28} className="next-step-icon" />
              <h4>{title}</h4>
              <p>{text}</p>
              <span className="next-step-link">Get started <ArrowRight size={13} /></span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Boundary Scanner ─────────────────────────────────────────────────────────
function BoundaryScreen({ setScreen, setScanResult }) {
  const [geometry, setGeometry] = useState(null);
  const [landName, setLandName] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError]       = useState(null);

  const handleScan = useCallback(async () => {
    if (!geometry) return;
    setScanning(true); setError(null);
    try {
      const result = await scanBoundary(geometry, landName || 'My Parcel');
      setScanResult(result);
      setScreen('eligibility');
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Scan failed. Is the backend running?');
    } finally {
      setScanning(false);
    }
  }, [geometry, landName, setScanResult, setScreen]);

  const step = geometry ? 2 : 1;

  return (
    <div className="scan-page">
      {/* Header */}
      <div className="scan-header">
        <div>
          <h1 className="scan-title">Land Eligibility Scanner</h1>
          <p className="scan-sub">Draw your parcel boundary to receive a real satellite-backed carbon assessment.</p>
        </div>
        <div className="scan-steps">
          <div className={`scan-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}>
            <span>1</span> Draw boundary
          </div>
          <div className="scan-step-line" />
          <div className={`scan-step ${step >= 2 ? 'active' : ''}`}>
            <span>2</span> Run scan
          </div>
          <div className="scan-step-line" />
          <div className="scan-step"><span>3</span> View results</div>
        </div>
      </div>

      {/* Body */}
      <div className="scan-body">
        {/* Map */}
        <div className="scan-map-col">
          <BoundaryMap onBoundaryChange={setGeometry} />
        </div>

        {/* Right panel */}
        <div className="scan-right-col">
          {/* Status card */}
          <div className={`scan-status-card ${geometry ? 'ready' : 'waiting'}`}>
            {geometry ? (
              <>
                <CheckCircle size={20} className="scan-status-icon green" />
                <div>
                  <strong>Boundary captured</strong>
                  <p>Your parcel boundary is ready for scanning.</p>
                </div>
              </>
            ) : (
              <>
                <Map size={20} className="scan-status-icon muted" />
                <div>
                  <strong>No boundary yet</strong>
                  <p>Click on the map to start placing boundary points.</p>
                </div>
              </>
            )}
          </div>

          {/* Parcel name */}
          <div className="scan-field">
            <label>Parcel name <span>(optional)</span></label>
            <input
              className="scan-input"
              placeholder="e.g. North Moor, Sutherland"
              value={landName}
              onChange={e => setLandName(e.target.value)}
            />
          </div>

          {/* Run scan button */}
          <button
            className={`scan-run-btn ${!geometry || scanning ? 'disabled' : ''}`}
            disabled={!geometry || scanning}
            onClick={handleScan}
          >
            {scanning ? (
              <><Loader size={16} className="spin" /> Fetching satellite data…</>
            ) : (
              <><ShieldCheck size={16} /> Run Eligibility Scan</>
            )}
          </button>

          {error && (
            <div className="scan-error">
              <AlertTriangle size={14} />{error}
            </div>
          )}

          {/* How to draw */}
          <div className="scan-guide">
            <p className="scan-guide-title">How to draw</p>
            <ol>
              <li>Click points around your land parcel</li>
              <li>Add at least 3 points</li>
              <li>Click <strong>Close &amp; Finish Boundary</strong></li>
              <li>Hit <strong>Run Eligibility Scan</strong></li>
            </ol>
          </div>

          {/* Data sources */}
          <div className="scan-sources">
            <p className="scan-guide-title">Data sources</p>
            {[
              ['#16a34a', 'Sentinel-2 L2A — ESA Copernicus'],
              ['#2563eb', 'SoilGrids v2.0 — ISRIC'],
              ['#d97706', 'WCC + Peatland Code rules'],
              ['#7c3aed', 'LightGBM ML scorer'],
            ].map(([color, label]) => (
              <div key={label} className="scan-source-row">
                <span className="scan-source-dot" style={{ background: color }} />
                {label}
              </div>
            ))}
          </div>

          <p className="scan-disclaimer">
            Preliminary estimates only — not verified credits or guaranteed revenue.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Boundary Info Panel ──────────────────────────────────────────────────────
function BoundaryPanel({ scanResult }) {
  const geojson   = scanResult?.geometry || null;
  const coords    = scanResult?.boundary_coordinates || [];
  const centLat   = scanResult?.centroid_lat;
  const centLon   = scanResult?.centroid_lon;
  const placeName = scanResult?.place_name || '';
  const area_ha   = scanResult?.area_ha || 0;
  const si        = scanResult?.sentinel_indices || {};
  const sd        = scanResult?.soil_data || {};
  const [showAll, setShowAll] = useState(false);

  const displayCoords = showAll ? coords : coords.slice(0, 8);
  const gmapsUrl = centLat && centLon
    ? `https://www.google.com/maps?q=${centLat},${centLon}`
    : null;

  return (
    <div className="bp-wrapper">
      {/* Mini map */}
      <div className="bp-map-col">
        <BoundaryMap
          readOnly
          geojson={geojson}
          initialCenter={centLat && centLon ? [centLat, centLon] : [57.0, -4.0]}
          initialZoom={geojson ? 12 : 7}
        />
        <div className="bp-map-caption">
          Drawn boundary · {coords.length} vertices · {area_ha} ha
        </div>
      </div>

      {/* Right info */}
      <div className="bp-info-col">
        {/* Location */}
        <div className="bp-section">
          <div className="bp-section-title"><MapPin size={13} /> Location</div>
          <div className="bp-location-name">{placeName || 'Unknown location'}</div>
          <div className="bp-coords-row">
            <span>Centroid:</span>
            <code>{centLat?.toFixed(6)}, {centLon?.toFixed(6)}</code>
            {gmapsUrl && (
              <a href={gmapsUrl} target="_blank" rel="noopener noreferrer" className="bp-gmaps-link">
                Google Maps ↗
              </a>
            )}
          </div>
        </div>

        {/* Boundary coordinates table */}
        <div className="bp-section">
          <div className="bp-section-title"><Map size={13} /> Boundary Vertices</div>
          <div className="bp-coord-table-wrap">
            <table className="bp-coord-table">
              <thead>
                <tr><th>#</th><th>Latitude</th><th>Longitude</th></tr>
              </thead>
              <tbody>
                {displayCoords.map(c => (
                  <tr key={c.point}>
                    <td>{c.point}</td>
                    <td><code>{c.lat}</code></td>
                    <td><code>{c.lon}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {coords.length > 8 && (
            <button className="bp-show-more" onClick={() => setShowAll(v => !v)}>
              {showAll ? `▲ Show less` : `▼ Show all ${coords.length} points`}
            </button>
          )}
        </div>

        {/* Data provenance */}
        <div className="bp-section">
          <div className="bp-section-title">Data Sources Used</div>
          <div className="bp-source-list">
            <div className="bp-source-row">
              <span className="bp-source-dot" style={{ background: '#16a34a' }} />
              <div>
                <strong>Sentinel-2 L2A</strong>
                <span>{si?.data_source || 'Element84 STAC / AWS'}</span>
                {si?.acquisition_date && <span>Scene date: {si.acquisition_date}</span>}
                {si?.scene_id && <span className="bp-scene-id">ID: {si.scene_id}</span>}
                {si?.cloud_cover != null && <span>Cloud cover: {si.cloud_cover.toFixed(1)}%</span>}
              </div>
            </div>
            <div className="bp-source-row">
              <span className="bp-source-dot" style={{ background: '#2563eb' }} />
              <div>
                <strong>SoilGrids v2.0</strong>
                <span>{sd?.data_source || 'ISRIC World Soil Information'}</span>
                {centLat && centLon && (
                  <span>Query point: {centLat.toFixed(4)}°N, {centLon.toFixed(4)}°E</span>
                )}
              </div>
            </div>
            <div className="bp-source-row">
              <span className="bp-source-dot" style={{ background: '#7c3aed' }} />
              <div>
                <strong>Area calculation</strong>
                <span>pyproj Geod (WGS84 ellipsoid) — {area_ha} ha</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── Eligibility Results ──────────────────────────────────────────────────────
function EligibilityScreen({ setScreen, scanResult }) {
  const [rulesOpen, setRulesOpen] = useState({ wcc: true, peat: true });

  if (!scanResult) {
    return (
      <div className="elig-empty">
        <div className="elig-empty-box">
          <Map size={40} strokeWidth={1.5} />
          <h2>No scan results yet</h2>
          <p>Draw a boundary on the map and run an eligibility scan to see your results here.</p>
          <button className="btn-primary" onClick={() => setScreen('boundary')}>
            <Map size={14} /> Go to Scan Land
          </button>
        </div>
      </div>
    );
  }

  // null-safe — destructuring defaults don't apply to explicit null from backend
  const score      = scanResult.eligibility_score   ?? 0;
  const confidence = scanResult.confidence          ?? 'unknown';
  const pathway    = scanResult.recommended_pathway ?? '';
  const area_ha    = scanResult.area_ha             ?? 0;
  const land_name  = scanResult.land_name           ?? 'Unknown Parcel';
  const ptMs       = scanResult.processing_time_ms  ?? 0;
  const si         = scanResult.sentinel_indices     || {};
  const sd         = scanResult.soil_data            || {};
  const lc         = scanResult.land_cover           || {};
  const wccRules   = scanResult.wcc_rules            || [];
  const peatRules  = scanResult.peatland_rules       || [];
  const ce         = scanResult.carbon_estimate      || null;
  const mlScores   = scanResult.ml_scores            || {};
  const nextSteps  = scanResult.next_steps           || [];
  const placeName  = scanResult.place_name           || '';

  const pathwayLabel = pathway === 'peatland' ? 'Peatland Code'
    : pathway === 'wcc' ? 'Woodland Carbon Code' : 'No clear pathway';

  return (
    <div className="page">
      <PageHeader
        title="Eligibility Results"
        subtitle={`${land_name}${placeName ? ` · ${placeName}` : ''} · ${area_ha} ha · ${ptMs}ms`}
        action={
          <div className="btn-row">
            <button className="btn-outline" onClick={() => setScreen('report')}><FileText size={13} /> Full Report</button>
            <button className="btn-primary" onClick={() => setScreen('boundary')}><Map size={13} /> New Scan</button>
          </div>
        }
      />
      <Disclaimer />

      {/* Boundary map + coordinates */}
      <Card title="Selected Land Boundary">
        <BoundaryPanel scanResult={scanResult} />
      </Card>

      {/* Score hero */}
      <div className="score-hero">
        <div className="score-ring">
          <span className="score-number">{score}</span>
          <span className="score-label">/ 100</span>
        </div>
        <div className="score-meta">
          <h2>{score >= 70 ? 'High Eligibility' : score >= 45 ? 'Moderate Eligibility' : 'Low Eligibility'}</h2>
          <p>Confidence: <strong>{confidence}</strong></p>
          <div className={`pathway-badge ${pathway}`}>{pathwayLabel}</div>
        </div>
        <div className="score-summary">
          <StatRow label="Area" value={`${area_ha} ha`} />
          <StatRow label="Recommended pathway" value={pathwayLabel} badge badgeCls={pathway === 'peatland' ? 'badge-amber' : 'badge-green'} />
          <StatRow label="ML Confidence" value={confidence} badge badgeCls={confidence === 'high' ? 'badge-green' : confidence === 'medium' ? 'badge-amber' : 'badge-gray'} />
        </div>
      </div>

      {/* Data cards */}
      <div className="results-grid">
        <Card title="Satellite Indices — Sentinel-2 L2A">
          <p className="data-source">{si?.data_source}{si?.acquisition_date ? ` · ${si.acquisition_date}` : ''}{si?.cloud_cover != null ? ` · ${si.cloud_cover.toFixed(1)}% cloud` : ''}</p>
          {si?.ndvi != null ? (
            <div className="index-grid">
              {[['NDVI', si?.ndvi, 'Vegetation density'],['NDWI', si?.ndwi, 'Wetness'],['NDMI', si?.ndmi, 'Moisture'],['BSI', si?.bare_soil_index, 'Bare soil']].filter(([,v]) => v != null).map(([n, v, d]) => (
                <div key={n} className="index-item">
                  <span className="index-name">{n}</span>
                  <span className="index-val">{Number(v).toFixed(3)}</span>
                  <div className="index-bar"><div className="index-fill" style={{ width: `${((v+1)/2)*100}%` }} /></div>
                  <span className="index-desc">{d}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="notice warn"><AlertTriangle size={13} />No satellite data returned — draw a boundary inside the UK and retry.</div>
          )}
        </Card>

        <Card title="Soil Properties — SoilGrids">
          <p className="data-source">{sd?.data_source || 'ISRIC SoilGrids v2.0'}</p>
          <StatRow label="Organic Carbon" value={sd?.organic_carbon_g_per_kg != null ? `${sd.organic_carbon_g_per_kg} g/kg` : 'N/A'} />
          <StatRow label="Bulk Density"   value={sd?.bulk_density_kg_per_m3   != null ? `${sd.bulk_density_kg_per_m3} kg/m³` : 'N/A'} />
          <StatRow label="pH"             value={sd?.ph != null ? sd.ph : 'N/A'} />
          <StatRow label="Soil Class"
            value={sd?.is_peat ? 'Deep Peat (SOC ≥ 200 g/kg)' : sd?.is_peaty ? 'Peaty Mineral' : 'Mineral Soil'}
            badge badgeCls={sd?.is_peat ? 'badge-amber' : sd?.is_peaty ? 'badge-blue' : 'badge-gray'} />
        </Card>

        <Card title="Land Cover — Spectral Classification">
          <p className="data-source">{lc?.data_source || 'UKCEH LCM2023'}</p>
          <StatRow label="Dominant class" value={lc?.dominant_class || 'N/A'} badge badgeCls="badge-green" />
          {[['Peatland / heather', lc?.peatland_fraction],['Woodland', lc?.woodland_fraction],['Grassland', lc?.grassland_fraction]].map(([l, f]) => (
            <div key={l} className="cover-row">
              <span>{l}</span>
              <div className="cover-bar"><div className="cover-fill" style={{ width: `${(f ?? 0)*100}%` }} /></div>
              <span>{((f ?? 0)*100).toFixed(0)}%</span>
            </div>
          ))}
        </Card>

        <Card title="ML Assessment">
          <StatRow label="Eligibility Score"  value={`${mlScores.eligibility_score ?? score} / 100`} />
          <StatRow label="Confidence"         value={mlScores.confidence_level || confidence} badge badgeCls={mlScores.confidence_level === 'high' ? 'badge-green' : mlScores.confidence_level === 'medium' ? 'badge-amber' : 'badge-red'} />
          {mlScores.peatland_condition && <StatRow label="Peatland Condition" value={mlScores.peatland_condition} badge badgeCls="badge-blue" />}
          {mlScores.woodland_suitability != null && <StatRow label="Woodland Suitability" value={`${(mlScores.woodland_suitability*100).toFixed(0)}%`} />}
        </Card>
      </div>

      {/* Rules tables */}
      <div className="rules-section">
        {[['WCC Eligibility Rules', wccRules, 'wcc'], ['Peatland Code Rules', peatRules, 'peat']].map(([title, rules, key]) => (
          <Card key={key} className="rules-card">
            <button className="rules-toggle" onClick={() => setRulesOpen(p => ({ ...p, [key]: !p[key] }))}>
              <span>{title} ({rules.filter(r => r?.passed).length}/{rules.length} passed)</span>
              <ChevronDown size={16} className={rulesOpen[key] ? 'rotated' : ''} />
            </button>
            {rulesOpen[key] && (
              <div className="rules-body">
                {rules.length === 0
                  ? <p style={{ padding: '12px 0', color: 'var(--slate-400)', fontSize: 13 }}>No rule data available.</p>
                  : rules.map((r, i) => (
                    <div key={i} className={`rule-row ${r?.passed ? 'pass' : 'fail'}`}>
                      <span className="rule-icon">{r?.passed ? '✓' : '✗'}</span>
                      <div><strong>{r?.rule}</strong><small>{r?.value} — {r?.note}</small></div>
                    </div>
                  ))
                }
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Carbon estimate */}
      {ce && (
        <Card title="💰 Carbon Estimate — Deterministic · Pre-screening only" className="estimate-card">
          <Disclaimer />
          <div className="estimate-grid">
            {[['Pathway', ce.pathway === 'peatland' ? 'Peatland Code' : 'WCC'],['Eligible Area', `${ce.eligible_area_ha} ha`],
              ['Crediting Period', `${ce.crediting_years} years`],['Annual Rate', `${ce.annual_rate_tco2e_per_ha} tCO₂e/ha/yr`],
              ['Net Units', `${ce.net_units_tco2e?.toLocaleString()} tCO₂e`],['Confidence', ce.confidence_band]].map(([k,v]) => (
              <div key={k} className="estimate-item"><span>{k}</span><strong>{v}</strong></div>
            ))}
          </div>
          <div className="value-range">
            {[['low','Low',ce.price_low,ce.low_value_gbp],['mid','Mid',ce.price_mid,ce.mid_value_gbp],['high','High',ce.price_high,ce.high_value_gbp]].map(([cls,label,price,val]) => (
              <div key={cls} className={`value-col ${cls}`}>
                <span>{label} (£{price}/t)</span>
                <strong>£{val?.toLocaleString()}</strong>
              </div>
            ))}
          </div>
          <button className="btn-primary" onClick={() => setScreen('report')}>View Full Report <ArrowRight size={14} /></button>
        </Card>
      )}

      <Card title="Recommended Next Steps">
        <ol className="steps-list">
          {nextSteps.length > 0
            ? nextSteps.map((s, i) => <li key={i}>{s}</li>)
            : <li>Run a scan to see recommended next steps.</li>}
        </ol>
      </Card>
    </div>
  );
}

// ─── Carbon Report ────────────────────────────────────────────────────────────
function ReportScreen({ setScreen, scanResult }) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfDone, setPdfDone]       = useState(null);

  const handleDownloadPDF = async () => {
    setPdfLoading(true); setPdfDone(null);
    try {
      const filename = await generateEligibilityPDF(scanResult);
      setPdfDone(filename);
    } catch (e) {
      console.error('PDF error:', e);
      setPdfDone('error');
    } finally {
      setPdfLoading(false);
    }
  };

  if (!scanResult) return (
    <div className="page">
      <PageHeader title="Carbon Report" subtitle="Complete a land scan first." />
      <div className="empty-state">
        <FileText size={40} />
        <p>No scan data yet. Draw a land boundary and run an eligibility scan first.</p>
        <button className="btn-primary" onClick={() => setScreen('boundary')}><Map size={14} /> Scan My Land</button>
      </div>
    </div>
  );

  const {
    land_name = 'Unknown Parcel',
    area_ha   = 0,
    eligibility_score = 0,
    confidence = 'unknown',
    recommended_pathway = '',
    processing_time_ms = 0,
    carbon_estimate: ce = null,
    soil_data: sd       = {},
    sentinel_indices: si = {},
    land_cover: lc      = {},
    wcc_rules           = [],
    peatland_rules      = [],
    ml_scores           = {},
    next_steps          = [],
  } = scanResult;

  const refId = `OHMC-RPT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const genDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const pathwayLabel = recommended_pathway === 'peatland' ? 'Peatland Code'
    : recommended_pathway === 'wcc' ? 'Woodland Carbon Code' : 'No clear pathway';
  const scoreColor = eligibility_score >= 70 ? '#16a34a' : eligibility_score >= 45 ? '#d97706' : '#dc2626';

  return (
    <div className="page rpt-page">

      {/* ── Report Header ── */}
      <div className="rpt-header">
        <div className="rpt-header-left">
          <div className="rpt-logo-row">
            <img src={logoImg} alt="OHMC" className="rpt-logo" />
            <div>
              <div className="rpt-company">OHMC CarbonOS</div>
              <div className="rpt-tagline">Carbon Eligibility &amp; Opportunity Report</div>
            </div>
          </div>
          <h1 className="rpt-parcel-name">{land_name}</h1>
          <p className="rpt-parcel-sub">Preliminary Assessment · {area_ha} hectares · {genDate}</p>
        </div>
        <div className="rpt-header-right">
          <div className="rpt-score-block" style={{ borderColor: scoreColor }}>
            <div className="rpt-score-num" style={{ color: scoreColor }}>{eligibility_score}</div>
            <div className="rpt-score-denom">/ 100</div>
            <div className="rpt-score-label">Eligibility Score</div>
          </div>
          <div className="rpt-meta">
            <div><span>Ref</span><strong>{refId}</strong></div>
            <div><span>Generated</span><strong>{genDate}</strong></div>
            <div><span>Valid</span><strong>90 days</strong></div>
            <div><span>Pathway</span><strong>{pathwayLabel}</strong></div>
            <div><span>Confidence</span><strong>{confidence}</strong></div>
          </div>
        </div>
      </div>

      {/* ── PDF button + status ── */}
      <div className="rpt-actions-bar">
        <button
          className={`rpt-pdf-btn ${pdfLoading ? 'loading' : ''}`}
          onClick={handleDownloadPDF}
          disabled={pdfLoading}
        >
          {pdfLoading
            ? <><Loader size={15} className="spin" /> Generating PDF…</>
            : <><Download size={15} /> Download PDF Report</>}
        </button>
        <button className="btn-outline" onClick={() => setScreen('eligibility')}>
          <ShieldCheck size={14} /> View Eligibility
        </button>
        <button className="btn-outline" onClick={() => setScreen('partner')}>
          <Handshake size={14} /> Partner Review
        </button>
        {pdfDone && pdfDone !== 'error' && (
          <span className="rpt-pdf-success"><CheckCircle size={13} /> Saved: {pdfDone}</span>
        )}
        {pdfDone === 'error' && (
          <span className="rpt-pdf-error"><AlertTriangle size={13} /> PDF generation failed</span>
        )}
      </div>

      <Disclaimer />

      {/* ── Summary metrics ── */}
      <div className="rpt-metrics">
        <div className="rpt-metric accent">
          <ShieldCheck size={18} />
          <div className="rpt-metric-val" style={{ color: scoreColor }}>{eligibility_score}<span>/100</span></div>
          <div className="rpt-metric-lbl">Eligibility Score</div>
        </div>
        <div className="rpt-metric">
          <Map size={18} />
          <div className="rpt-metric-val">{area_ha}<span> ha</span></div>
          <div className="rpt-metric-lbl">Area Assessed</div>
        </div>
        {ce && (
          <div className="rpt-metric">
            <TrendingUp size={18} />
            <div className="rpt-metric-val">{ce.net_units_tco2e?.toLocaleString()}<span> tCO₂e</span></div>
            <div className="rpt-metric-lbl">Indicative Carbon</div>
          </div>
        )}
        {ce && (
          <div className="rpt-metric">
            <CircleDollarSign size={18} />
            <div className="rpt-metric-val">£{ce.mid_value_gbp?.toLocaleString()}</div>
            <div className="rpt-metric-lbl">Mid Value (gross)</div>
          </div>
        )}
        <div className="rpt-metric">
          <Leaf size={18} />
          <div className="rpt-metric-val" style={{ fontSize: 13 }}>{pathwayLabel}</div>
          <div className="rpt-metric-lbl">Pathway</div>
        </div>
      </div>

      {/* ── Boundary ── */}
      <Card title="Selected Land Boundary">
        <BoundaryPanel scanResult={scanResult} />
      </Card>

      {/* ── Satellite data ── */}
      <Card title="Satellite Data — Sentinel-2 L2A (ESA Copernicus)">
        <p className="data-source">{si?.data_source}{si?.acquisition_date ? ` · ${si.acquisition_date}` : ''}{si?.cloud_cover != null ? ` · ${si.cloud_cover.toFixed(1)}% cloud cover` : ''}</p>
        <div className="rpt-sat-grid">
          {[
            ['NDVI', si?.ndvi, 'Vegetation density', '#16a34a'],
            ['NDWI', si?.ndwi, 'Wetness / moisture', '#2563eb'],
            ['NDMI', si?.ndmi, 'Canopy moisture',    '#7c3aed'],
            ['BSI',  si?.bare_soil_index, 'Bare soil index', '#d97706'],
          ].map(([name, val, desc, color]) => (
            <div key={name} className="rpt-sat-card">
              <div className="rpt-sat-name" style={{ color }}>{name}</div>
              <div className="rpt-sat-val">{val != null ? Number(val).toFixed(4) : 'N/A'}</div>
              <div className="rpt-sat-bar">
                <div className="rpt-sat-fill" style={{ width: `${val != null ? ((val+1)/2)*100 : 0}%`, background: color }} />
              </div>
              <div className="rpt-sat-desc">{desc}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Soil + Land cover ── */}
      <div className="two-col-grid">
        <Card title="Soil Properties — SoilGrids v2.0 (ISRIC)">
          <p className="data-source">{sd?.data_source || 'ISRIC SoilGrids v2.0 · 250m resolution'}</p>
          <StatRow label="Organic Carbon (SOC)" value={sd?.organic_carbon_g_per_kg != null ? `${sd.organic_carbon_g_per_kg} g/kg` : 'N/A'} />
          <StatRow label="Bulk Density"          value={sd?.bulk_density_kg_per_m3   != null ? `${sd.bulk_density_kg_per_m3} kg/m³` : 'N/A'} />
          <StatRow label="pH"                    value={sd?.ph != null ? sd.ph : 'N/A'} />
          <StatRow label="Soil Classification"
            value={sd?.is_peat ? 'Deep Peat (SOC ≥ 200 g/kg)' : sd?.is_peaty ? 'Peaty Mineral' : 'Mineral Soil'}
            badge
            badgeCls={sd?.is_peat ? 'badge-amber' : sd?.is_peaty ? 'badge-blue' : 'badge-gray'} />
        </Card>

        <Card title="Land Cover — UKCEH LCM2023">
          <p className="data-source">{lc?.data_source || 'UK Countryside Survey 2023'}</p>
          <StatRow label="Dominant Class" value={lc?.dominant_class || 'N/A'} badge badgeCls="badge-green" />
          {[
            ['Peatland / Heather', lc?.peatland_fraction],
            ['Woodland',           lc?.woodland_fraction],
            ['Grassland',          lc?.grassland_fraction],
          ].map(([label, fraction]) => (
            <div key={label} className="cover-row">
              <span>{label}</span>
              <div className="cover-bar"><div className="cover-fill" style={{ width: `${(fraction ?? 0)*100}%` }} /></div>
              <span>{((fraction ?? 0)*100).toFixed(0)}%</span>
            </div>
          ))}
        </Card>
      </div>

      {/* ── WCC + Peatland rules summary ── */}
      <div className="two-col-grid">
        {[
          ['Woodland Carbon Code Rules', wcc_rules,      '#16a34a'],
          ['Peatland Code Rules',        peatland_rules, '#d97706'],
        ].map(([title, rules, color]) => (
          <Card key={title} title={title}>
            {rules.length === 0
              ? <p style={{ fontSize: 13, color: 'var(--slate-400)' }}>No rule data available.</p>
              : <>
                  <div className="rpt-rules-summary">
                    <span className="rpt-rules-pass" style={{ color }}>
                      {rules.filter(r => r?.passed).length} passed
                    </span>
                    <span className="rpt-rules-fail">
                      {rules.filter(r => !r?.passed).length} failed
                    </span>
                    <span>of {rules.length} rules</span>
                  </div>
                  {rules.map((r, i) => (
                    <div key={i} className={`rule-row ${r?.passed ? 'pass' : 'fail'}`}>
                      <span className="rule-icon">{r?.passed ? '✓' : '✗'}</span>
                      <div>
                        <strong>{r?.rule}</strong>
                        <small>{r?.value}{r?.note ? ` — ${r.note}` : ''}</small>
                      </div>
                    </div>
                  ))}
                </>
            }
          </Card>
        ))}
      </div>

      {/* ── Carbon estimate ── */}
      {ce && (
        <Card title="Carbon Estimate — Deterministic Model · Pre-screening only" className="estimate-card">
          <Disclaimer />
          <div className="estimate-grid">
            {[
              ['Pathway',        ce.pathway === 'peatland' ? 'Peatland Code' : 'WCC'],
              ['Eligible Area',  `${ce.eligible_area_ha} ha`],
              ['Crediting Period', `${ce.crediting_years} years`],
              ['Annual Rate',    `${ce.annual_rate_tco2e_per_ha} tCO₂e/ha/yr`],
              ['Net Units',      `${ce.net_units_tco2e?.toLocaleString()} tCO₂e`],
              ['Confidence',     ce.confidence_band],
            ].map(([k, v]) => (
              <div key={k} className="estimate-item"><span>{k}</span><strong>{v}</strong></div>
            ))}
          </div>
          <div className="value-range">
            {[
              ['low',  'Low',  ce.price_low,  ce.low_value_gbp],
              ['mid',  'Mid',  ce.price_mid,  ce.mid_value_gbp],
              ['high', 'High', ce.price_high, ce.high_value_gbp],
            ].map(([cls, label, price, val]) => (
              <div key={cls} className={`value-col ${cls}`}>
                <span>{label} (£{price}/t)</span>
                <strong>£{val?.toLocaleString()}</strong>
                <small>£{Math.round(val / ce.crediting_years).toLocaleString()} / yr</small>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Next steps ── */}
      <Card title="Recommended Next Steps">
        <ol className="steps-list">
          {next_steps.length > 0
            ? next_steps.map((s, i) => <li key={i}>{s}</li>)
            : <li>Run a scan to generate recommended next steps.</li>}
        </ol>
        <div className="report-actions">
          <button className="btn-primary" onClick={() => setScreen('partner')}>
            Proceed to Partner Review <ArrowRight size={14} />
          </button>
          <button className="btn-outline" onClick={handleDownloadPDF} disabled={pdfLoading}>
            {pdfLoading ? <><Loader size={13} className="spin" /> Generating…</> : <><Download size={13} /> Download PDF</>}
          </button>
        </div>
      </Card>

      <Card className="legal-notice">
        <h4>Important Disclaimer</h4>
        <p>This report is a preliminary desktop assessment and does not constitute a validated carbon project, verification statement, or guarantee of carbon credit issuance. All volumes and values are estimates based on automated analysis of open satellite and soil datasets, and have not been independently verified. OHMC acts as a trusted mediator only — it does not issue, certify, or underwrite carbon credits. Formal project registration requires independent validation by an accredited VVB under the relevant standard.</p>
      </Card>
    </div>
  );
}

// ─── Marketplace ──────────────────────────────────────────────────────────────
const SOURCE_LABELS = {
  verra:       { label: 'Verra VCS', color: '#1e40af' },
  goldstandard:{ label: 'Gold Standard', color: '#92400e' },
  local:       { label: 'OHMC Registry', color: '#166534' },
};

function MarketplaceScreen({ setScreen }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [filter, setFilter]     = useState('All');
  const [source, setSource]     = useState('all');

  const load = (src) => {
    setLoading(true); setError(null);
    listMarketplace({ source: src })
      .then(d => { setProjects(d); setLoading(false); })
      .catch(e => { setError('Could not load projects. Is the backend running?'); setLoading(false); });
  };

  useEffect(() => { load('all'); }, []);

  const statuses = ['All','Estimated Only','Pre-Validation','Validated PIU','Verified Credit'];
  const filtered = filter === 'All' ? projects : projects.filter(p => p.status === filter);

  return (
    <div className="page">
      <PageHeader
        title="Carbon Marketplace"
        subtitle="Live data from Verra VCS, Gold Standard and UK OHMC registries."
      />

      {/* Source selector */}
      <div className="mkt-source-bar">
        {[['all','All Sources'],['verra','Verra VCS'],['goldstandard','Gold Standard'],['local','OHMC UK']].map(([id, label]) => (
          <button key={id}
            className={`mkt-source-btn ${source === id ? 'active' : ''}`}
            onClick={() => { setSource(id); load(id); }}>
            {label}
          </button>
        ))}
        <span className="mkt-count">{projects.length} projects</span>
      </div>

      {/* Status filters */}
      <div className="filter-bar">
        {statuses.map(s => (
          <button key={s} className={`filter-chip ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>{s}</button>
        ))}
      </div>

      {loading && <Spinner text="Fetching live registry data…" />}
      {error   && <div className="notice error"><AlertTriangle size={14} />{error}</div>}
      {!loading && !error && (
        <>
          <div className="project-grid">
            {filtered.map((p, i) => <ProjectCard key={p.id || p.registry_id || i} project={p} setScreen={setScreen} />)}
          </div>
          {filtered.length === 0 && <p className="empty-msg">No projects match this filter.</p>}
        </>
      )}
    </div>
  );
}

function ProjectCard({ project: p, setScreen }) {
  const cls = TRUST_CLS[p.status] || 'muted';
  const src = SOURCE_LABELS[p.source] || SOURCE_LABELS.local;
  return (
    <div className="project-card">
      <div className="project-card-header">
        <span className={`trust-pill ${cls}`}>{p.status}</span>
        <span className="proj-registry-badge" style={{ background: src.color + '18', color: src.color, border: `1px solid ${src.color}40` }}>
          {src.label}
        </span>
      </div>
      <div className="project-card-body">
        <h3>{p.title}</h3>
        <p className="project-loc"><MapPin size={12} />{p.location}</p>
        <p className="project-type"><Leaf size={12} />{p.type}{p.methodology ? ` · ${p.methodology}` : ''}</p>
        <div className="project-vols">
          <span><small>Annual Volume</small><strong>{p.volume_tco2e || 'N/A'}</strong></span>
          <span><small>Total</small><strong>{p.total_tco2e || 'N/A'}</strong></span>
        </div>
        <p className="claim-note">{p.claim_guidance}</p>
        <div className="proj-card-actions">
          <button className="btn-dark" style={{ flex: 1 }} onClick={() => setScreen('project')}>
            View Detail <ArrowRight size={13} />
          </button>
          {p.registry_url && (
            <a href={p.registry_url} target="_blank" rel="noopener noreferrer" className="btn-outline proj-registry-link">
              Registry ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Project Detail ───────────────────────────────────────────────────────────
function ProjectDetail({ setScreen, user }) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '', org: user?.org || '', email: user?.email || '', volume: '',
  });
  const set = (k,v) => setForm(f => ({...f,[k]:v}));

  async function handleInterest(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await registerInterest('proj-cairngorms', {
        buyer_name: form.name,
        organisation: form.org,
        email: form.email,
        volume_interest: form.volume,
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true); // still show success to user
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <button className="back-btn" onClick={() => setScreen('marketplace')}>← Back to Marketplace</button>
      <div className="project-hero-banner">
        <span className="trust-pill warn">Pre-Validation</span>
        <h1>Scottish Peatland Restoration Project</h1>
        <p><MapPin size={14} /> Cairngorms National Park, Scotland</p>
        <div className="project-facts-row">
          <span><strong>12,500 tCO₂e</strong> estimated annual volume</span>
          <span><strong>2026–2045</strong> project vintage</span>
          <span><strong>Peatland Code</strong> methodology</span>
        </div>
      </div>
      <div className="notice warn"><AlertTriangle size={14} /> Pre-Validation status. No offset claims permitted. You may register interest and request due diligence only.</div>
      <div className="two-col-grid">
        <Card title="Project Overview">
          <p style={{ fontSize: 14, color: 'var(--slate-500)', lineHeight: 1.65, marginBottom: 16 }}>
            Large-scale peatland rewetting initiative in the Cairngorms National Park. This project is not presented as a verified credit until independent validation and verification are complete.
          </p>
          <div className="small-facts">
            {[['Proponent','Highland Climate Partners'],['Land Area','2,300 ha'],['Project Start','Q1 2026'],['Credit Type','Removals + Avoided Emissions']].map(([l,v]) => (
              <StatRow key={l} label={l} value={v} />
            ))}
          </div>
        </Card>
        <Card title="Claims Guidance">
          <div className="claims-split">
            <div>
              <h4 className="green">You Can</h4>
              {['Register interest','Request due diligence pack','Demonstrate purchase intent'].map(i => (
                <div key={i} className="checklist-row"><CheckCircle size={13} className="green" /><span>{i}</span></div>
              ))}
            </div>
            <div>
              <h4 className="red">Cannot Claim</h4>
              {['Net zero offset','Specific reductions','Carbon neutrality'].map(i => (
                <div key={i} className="checklist-row"><X size={13} className="red" /><span>{i}</span></div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card title="Register Buyer Interest">
        {submitted ? (
          <div className="success-state">
            <CheckCircle size={44} className="green" />
            <h3>Interest Registered</h3>
            <p>OHMC will be in touch within 2 business days with next steps and a due diligence pack.</p>
          </div>
        ) : (
          <>
            <p className="card-intro">No commitment required. OHMC will facilitate introductions and provide full guidance.</p>
            <div className="form-grid">
              <div className="form-group"><label>Your Name *</label><input className="input" placeholder="Full name" value={form.name} onChange={e => set('name',e.target.value)} /></div>
              <div className="form-group"><label>Organisation *</label><input className="input" placeholder="Company name" value={form.org} onChange={e => set('org',e.target.value)} /></div>
              <div className="form-group"><label>Email *</label><input className="input" type="email" placeholder="you@company.com" value={form.email} onChange={e => set('email',e.target.value)} /></div>
              <div className="form-group">
                <label>Volume of Interest</label>
                <select className="input" value={form.volume} onChange={e => set('volume',e.target.value)}>
                  <option value="">Select range</option>
                  {['Under 1,000 tCO₂e','1,000–5,000 tCO₂e','5,000–20,000 tCO₂e','Over 20,000 tCO₂e'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <button className="btn-primary" onClick={handleInterest} disabled={submitting}>
              {submitting ? <><Loader size={14} className="spin" /> Registering…</> : <>Register Interest <ArrowRight size={14} /></>}
            </button>
          </>
        )}
      </Card>
    </div>
  );
}

// ─── Buyer Dashboard ──────────────────────────────────────────────────────────
function BuyerDashboard({ user, setScreen }) {
  const [projects, setProjects] = useState([]);
  useEffect(() => { listProjects().then(setProjects).catch(() => {}); }, []);

  return (
    <div className="page">
      <PageHeader title={`Welcome, ${user?.name || 'Buyer'}`}
        subtitle="Track carbon projects, manage preferences and build your ESG evidence."
        action={<button className="btn-primary" onClick={() => setScreen('marketplace')}>Browse All <ArrowRight size={14} /></button>} />
      <div className="metrics-row">
        <Metric icon={Heart}            label="Shortlisted"         value="12"           note="Projects saved" accent />
        <Metric icon={ShieldCheck}      label="Verified Available"  value="5"            note="Ready to purchase" />
        <Metric icon={TrendingUp}       label="Volume of Interest"  value="8,500 tCO₂e" />
        <Metric icon={CircleDollarSign} label="Est. Budget Range"   value="£127k" />
      </div>
      <Card title="Shortlisted Projects">
        <div className="project-grid">
          {projects.slice(0, 3).map(p => <ProjectCard key={p.id} project={p} setScreen={setScreen} />)}
          {projects.length === 0 && <Spinner />}
        </div>
      </Card>
      <Card title="Status & Claims Guide">
        <p className="card-intro">What you can claim based on project status:</p>
        {[['Estimated Only','muted','No offset claim permitted'],['Pre-Validation','warn','Interest only — no offset claim'],['Validated PIU','blue','Future claim only — register interest'],['Verified Credit','good','Claims permitted after retirement'],['Retired','good','Claim evidence issued to buyer']].map(([s,cls,note]) => (
          <div key={s} className="trust-guide-row"><span className={`trust-pill ${cls}`}>{s}</span><span>{note}</span></div>
        ))}
      </Card>
    </div>
  );
}

// ─── Partner Portal ───────────────────────────────────────────────────────────
function PartnerPortal({ setScreen }) {
  return (
    <div className="page">
      <PageHeader title="Partner / Verifier Portal" subtitle="Review, validate and verify carbon projects with confidence." />
      <div className="metrics-row">
        <Metric icon={FileText}      label="Assigned Projects"    value="12"  accent />
        <Metric icon={CheckCircle}   label="Evidence Complete"    value="68%" />
        <Metric icon={AlertTriangle} label="Outstanding Tasks"    value="18"  />
        <Metric icon={ShieldCheck}   label="Ready for Validation" value="5"   />
      </div>
      <div className="two-col-grid">
        <Card title="My Assigned Projects">
          {[['Glenfinnan Woodland','Review in progress',72],['Highland Peatland','Evidence review',41],['Argyll Wetlands','Ready for validation',92],['Northwoods Afforestation','Draft',26]].map(([name,status,pct]) => (
            <div key={name} className="progress-row">
              <div><strong>{name}</strong><small>{status}</small></div>
              <div className="prog-bar"><div className="prog-fill" style={{ width: `${pct}%` }} /></div>
              <span>{pct}%</span>
            </div>
          ))}
        </Card>
        <Card title="Outstanding Tasks">
          {[['Verify soil sampling data','Due today'],['Review lab report','Due in 2 days'],['Check additionality evidence','Due in 3 days'],['Confirm boundary maps','Due in 5 days']].map(([task,due]) => (
            <div key={task} className="task-row">
              <div><strong>{task}</strong><small>{due}</small></div>
              <button className="btn-sm">Review</button>
            </div>
          ))}
        </Card>
      </div>
      <Card title="Review Actions">
        <div className="action-btns">
          <button className="action-btn good"><CheckCircle size={16} /> Approve Evidence</button>
          <button className="action-btn warn"><AlertTriangle size={16} /> Request More Information</button>
          <button className="action-btn info"><ShieldCheck size={16} /> Mark Ready for Validation</button>
        </div>
      </Card>
    </div>
  );
}

// ─── Admin ────────────────────────────────────────────────────────────────────
function AdminDashboard() {
  return (
    <div className="page">
      <PageHeader title="Admin Dashboard" subtitle="Platform-wide overview and project management." />
      <div className="metrics-row">
        <Metric icon={FileText}      label="Total Submissions" value="342" accent />
        <Metric icon={Users}         label="Pending Reviews"   value="74"  />
        <Metric icon={Handshake}     label="Active Buyers"     value="56"  />
        <Metric icon={AlertTriangle} label="Risk Flags"        value="17"  />
      </div>
      <Card title="Recent Project Submissions">
        <table className="data-table">
          <thead><tr><th>Project</th><th>Owner</th><th>Stage</th><th>Score</th></tr></thead>
          <tbody>
            {[['Glen Affric Woodland','Highland Landscapes Ltd.','Assessment','87'],
              ['Peatland Recovery Initiative','GreenEarth Partners','Discovery','72'],
              ['North East Blue Carbon','Coastal Futures SCIO','Verification','91'],
              ['Lowland Peat Cluster','Rewild Scotland','Assessment','68']].map(([n,o,s,sc]) => (
              <tr key={n}><td>{n}</td><td>{o}</td><td>{s}</td>
                <td><span className={`badge ${+sc>=80?'badge-green':'badge-amber'}`}>{sc}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
