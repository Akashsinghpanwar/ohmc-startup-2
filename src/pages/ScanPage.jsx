import { useState, useCallback } from 'react';
import { CheckCircle, Map, ShieldCheck, AlertTriangle, Loader } from 'lucide-react';
import BoundaryMap from '../components/BoundaryMap.jsx';
import { scanBoundary } from '../services/api.js';

export default function ScanPage({ setScreen, setScanResult }) {
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
      <div className="scan-header">
        <div>
          <h1 className="page-title">Land eligibility scanner</h1>
          <p className="page-subtitle">Draw your parcel boundary to receive a satellite-backed carbon assessment.</p>
        </div>
        <div className="scan-steps">
          {[['Draw boundary', 1], ['Run scan', 2], ['View results', 3]].map(([label, n], i) => (
            <div key={n} className="scan-step-wrap">
              {i > 0 && <div className="scan-step-line" />}
              <div className={`scan-step ${step >= n ? 'active' : ''} ${step > n ? 'done' : ''}`}>
                <span>{step > n ? <CheckCircle size={13} /> : n}</span> {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="scan-body">
        <div className="scan-map-col">
          <BoundaryMap onBoundaryChange={setGeometry} />
        </div>

        <div className="scan-right-col">
          <div className={`scan-status-card ${geometry ? 'ready' : 'waiting'}`}>
            {geometry ? (
              <>
                <CheckCircle size={18} className="scan-status-icon green" />
                <div>
                  <strong>Boundary captured</strong>
                  <p>Your parcel boundary is ready for scanning.</p>
                </div>
              </>
            ) : (
              <>
                <Map size={18} className="scan-status-icon muted" />
                <div>
                  <strong>No boundary yet</strong>
                  <p>Click on the map to start placing boundary points.</p>
                </div>
              </>
            )}
          </div>

          <div className="field">
            <label>Parcel name <span className="field-optional">(optional)</span></label>
            <input
              className="input"
              placeholder="e.g. North Moor, Sutherland"
              value={landName}
              onChange={e => setLandName(e.target.value)}
            />
          </div>

          <button
            className="btn btn-primary btn-block"
            disabled={!geometry || scanning}
            onClick={handleScan}
          >
            {scanning ? (
              <><Loader size={15} className="spin" /> Fetching satellite data…</>
            ) : (
              <><ShieldCheck size={15} /> Run eligibility scan</>
            )}
          </button>

          {error && (
            <div className="notice error">
              <AlertTriangle size={14} />{error}
            </div>
          )}

          <div className="scan-aside">
            <p className="scan-aside-title">How to draw</p>
            <ol className="mini-steps tight">
              <li>Click points around your land parcel on the map.</li>
              <li>Add at least 3 points — the scan button activates automatically.</li>
              <li>Press <strong>Run eligibility scan</strong> when you're ready.</li>
            </ol>
          </div>

          <div className="scan-aside">
            <p className="scan-aside-title">Data sources</p>
            {[
              ['var(--teal-600)',   'Sentinel-2 L2A — ESA Copernicus'],
              ['var(--blue-600)',   'SoilGrids v2.0 — ISRIC'],
              ['var(--amber-600)',  'WCC v2.1 + Peatland Code v1.1 rules'],
              ['var(--violet-600)', 'LightGBM eligibility scorer'],
            ].map(([color, label]) => (
              <div key={label} className="scan-source-row">
                <span className="scan-source-dot" style={{ background: color }} />
                {label}
              </div>
            ))}
          </div>

          <p className="scan-smallprint">
            Preliminary estimates only — not verified credits or guaranteed revenue.
          </p>
        </div>
      </div>
    </div>
  );
}
