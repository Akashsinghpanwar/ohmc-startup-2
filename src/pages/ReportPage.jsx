import { useState } from 'react';
import {
  Download, FileText, Map, ShieldCheck, CheckCircle, AlertTriangle,
  Loader, TrendingUp, CircleDollarSign, Leaf, ArrowRight, Handshake
} from 'lucide-react';
import {
  PageHeader, Card, StatRow, Disclaimer, EmptyState,
  pathwayLabel
} from '../components/ui.jsx';
import BoundaryPanel from '../components/BoundaryPanel.jsx';
import { generateEligibilityPDF } from '../utils/generatePDF.js';
import logoImg from '../assets/logo.png';

export default function ReportPage({ setScreen, scanResult }) {
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

  if (!scanResult) {
    return (
      <div className="page">
        <PageHeader title="Carbon report" subtitle="Generate a structured eligibility report from a completed scan." />
        <Card>
          <EmptyState
            icon={FileText}
            title="No scan data yet"
            body="Draw a land boundary and run an eligibility scan first — your report is generated from the scan results."
            action={
              <button className="btn btn-primary" onClick={() => setScreen('boundary')}>
                <Map size={14} /> Scan my land
              </button>
            }
          />
        </Card>
      </div>
    );
  }

  const {
    land_name = 'Unknown Parcel',
    area_ha   = 0,
    eligibility_score = 0,
    confidence = 'unknown',
    recommended_pathway = '',
    carbon_estimate: ce = null,
    soil_data: sd       = {},
    sentinel_indices: si = {},
    land_cover: lc      = {},
    wcc_rules           = [],
    peatland_rules      = [],
    next_steps          = [],
  } = scanResult;

  const refId = `OHMC-RPT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const genDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const scoreColor = eligibility_score >= 70 ? 'var(--green-600)' : eligibility_score >= 45 ? 'var(--amber-600)' : 'var(--red-600)';

  return (
    <div className="page">
      <PageHeader
        title="Carbon report"
        subtitle={`${land_name} · preliminary assessment · ${genDate}`}
        action={
          <div className="btn-row">
            <button className="btn btn-secondary" onClick={() => setScreen('eligibility')}>
              <ShieldCheck size={13} /> Eligibility
            </button>
            <button className="btn btn-primary" onClick={handleDownloadPDF} disabled={pdfLoading}>
              {pdfLoading
                ? <><Loader size={14} className="spin" /> Generating…</>
                : <><Download size={14} /> Download PDF</>}
            </button>
          </div>
        }
      />

      {pdfDone && pdfDone !== 'error' && (
        <div className="notice success"><CheckCircle size={13} /> Report saved: {pdfDone}</div>
      )}
      {pdfDone === 'error' && (
        <div className="notice error"><AlertTriangle size={13} /> PDF generation failed — please retry.</div>
      )}

      {/* Document header */}
      <div className="rpt-header card">
        <div className="rpt-header-left">
          <div className="rpt-logo-row">
            <img src={logoImg} alt="OHMC" className="rpt-logo" />
            <div>
              <div className="rpt-company">OHMC CarbonOS</div>
              <div className="rpt-tagline">Carbon Eligibility &amp; Opportunity Report</div>
            </div>
          </div>
          <h2 className="rpt-parcel-name">{land_name}</h2>
          <p className="rpt-parcel-sub">Preliminary assessment · {area_ha} hectares · {genDate}</p>
        </div>
        <div className="rpt-header-right">
          <div className="rpt-score-block" style={{ borderColor: scoreColor }}>
            <div className="rpt-score-num" style={{ color: scoreColor }}>{eligibility_score}</div>
            <div className="rpt-score-denom">/ 100</div>
            <div className="rpt-score-label">Eligibility score</div>
          </div>
          <div className="rpt-meta">
            <div><span>Reference</span><strong>{refId}</strong></div>
            <div><span>Generated</span><strong>{genDate}</strong></div>
            <div><span>Validity</span><strong>90 days</strong></div>
            <div><span>Pathway</span><strong>{pathwayLabel(recommended_pathway)}</strong></div>
            <div><span>Confidence</span><strong>{confidence}</strong></div>
          </div>
        </div>
      </div>

      <Disclaimer />

      {/* Summary metrics */}
      <div className="rpt-metrics">
        <div className="rpt-metric">
          <ShieldCheck size={16} />
          <div className="rpt-metric-val" style={{ color: scoreColor }}>{eligibility_score}<span>/100</span></div>
          <div className="rpt-metric-lbl">Eligibility score</div>
        </div>
        <div className="rpt-metric">
          <Map size={16} />
          <div className="rpt-metric-val">{area_ha}<span> ha</span></div>
          <div className="rpt-metric-lbl">Area assessed</div>
        </div>
        {ce && (
          <div className="rpt-metric">
            <TrendingUp size={16} />
            <div className="rpt-metric-val">{ce.net_units_tco2e?.toLocaleString()}<span> tCO₂e</span></div>
            <div className="rpt-metric-lbl">Indicative carbon</div>
          </div>
        )}
        {ce && (
          <div className="rpt-metric">
            <CircleDollarSign size={16} />
            <div className="rpt-metric-val">£{ce.mid_value_gbp?.toLocaleString()}</div>
            <div className="rpt-metric-lbl">Mid value (gross)</div>
          </div>
        )}
        <div className="rpt-metric">
          <Leaf size={16} />
          <div className="rpt-metric-val rpt-metric-val-sm">{pathwayLabel(recommended_pathway)}</div>
          <div className="rpt-metric-lbl">Pathway</div>
        </div>
      </div>

      <Card title="Assessed land boundary">
        <BoundaryPanel scanResult={scanResult} />
      </Card>

      <Card title="Satellite data — Sentinel-2 L2A (ESA Copernicus)">
        <p className="data-source">{si?.data_source}{si?.acquisition_date ? ` · ${si.acquisition_date}` : ''}{si?.cloud_cover != null ? ` · ${Number(si.cloud_cover).toFixed(1)}% cloud cover` : ''}</p>
        <div className="rpt-sat-grid">
          {[
            ['NDVI', si?.ndvi, 'Vegetation density', 'var(--teal-600)'],
            ['NDWI', si?.ndwi, 'Wetness / moisture', 'var(--blue-600)'],
            ['NDMI', si?.ndmi, 'Canopy moisture',    'var(--violet-600)'],
            ['BSI',  si?.bare_soil_index, 'Bare soil index', 'var(--amber-600)'],
          ].map(([name, val, desc, color]) => (
            <div key={name} className="rpt-sat-card">
              <div className="rpt-sat-name" style={{ color }}>{name}</div>
              <div className="rpt-sat-val">{val != null ? Number(val).toFixed(4) : 'N/A'}</div>
              <div className="rpt-sat-bar">
                <div className="rpt-sat-fill" style={{ width: `${val != null ? ((val + 1) / 2) * 100 : 0}%`, background: color }} />
              </div>
              <div className="rpt-sat-desc">{desc}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="two-col-grid">
        <Card title="Soil properties — SoilGrids v2.0 (ISRIC)">
          <p className="data-source">{sd?.data_source || 'ISRIC SoilGrids v2.0 · 250m resolution'}</p>
          <StatRow label="Organic carbon (SOC)" value={sd?.organic_carbon_g_per_kg != null ? `${sd.organic_carbon_g_per_kg} g/kg` : 'N/A'} />
          <StatRow label="Bulk density"          value={sd?.bulk_density_kg_per_m3 != null ? `${sd.bulk_density_kg_per_m3} kg/m³` : 'N/A'} />
          <StatRow label="pH"                    value={sd?.ph != null ? sd.ph : 'N/A'} />
          <StatRow label="Soil classification"
            value={(sd?.peat_status === 'deep_peat_likely' || sd?.is_peat) ? 'Deep peat likely — depth survey needed'
              : (sd?.peat_status === 'organic_peaty' || sd?.is_peaty) ? 'Organic / peaty — depth survey needed'
              : 'Mineral soil'}
            badge tone={(sd?.peat_status === 'deep_peat_likely' || sd?.is_peat) ? 'amber'
              : (sd?.peat_status === 'organic_peaty' || sd?.is_peaty) ? 'blue' : 'gray'} />
        </Card>

        <Card title="Land cover — UKCEH LCM2023">
          <p className="data-source">{lc?.data_source || 'UK Countryside Survey 2023'}</p>
          <StatRow label="Dominant class" value={lc?.dominant_class || 'N/A'} badge tone="green" />
          {[
            ['Peatland / heather', lc?.peatland_fraction],
            ['Woodland',           lc?.woodland_fraction],
            ['Grassland',          lc?.grassland_fraction],
          ].map(([label, fraction]) => (
            <div key={label} className="cover-row">
              <span>{label}</span>
              <div className="cover-bar"><div className="cover-fill" style={{ width: `${(fraction ?? 0) * 100}%` }} /></div>
              <span className="cover-pct">{((fraction ?? 0) * 100).toFixed(0)}%</span>
            </div>
          ))}
        </Card>
      </div>

      <div className="two-col-grid">
        {[
          ['Woodland Carbon Code rules', wcc_rules],
          ['Peatland Code rules',        peatland_rules],
        ].map(([title, rules]) => (
          <Card key={title} title={title}>
            {rules.length === 0
              ? <p className="rules-empty">No rule data available.</p>
              : <>
                  <div className="rpt-rules-summary">
                    <span className="rpt-rules-pass">{rules.filter(r => r?.passed).length} passed</span>
                    <span className="rpt-rules-fail">{rules.filter(r => !r?.passed).length} failed</span>
                    <span className="rpt-rules-total">of {rules.length} rules</span>
                  </div>
                  {rules.map((r, i) => (
                    <div key={i} className={`rule-row ${r?.passed ? 'pass' : 'fail'}`}>
                      <span className="rule-icon">{r?.passed ? '✓' : '✕'}</span>
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

      {ce && (
        <Card title="Carbon estimate — deterministic model, pre-screening only">
          <div className="estimate-grid">
            {[
              ['Pathway',          ce.pathway === 'peatland' ? 'Peatland Code' : 'WCC'],
              ['Eligible area',    `${ce.eligible_area_ha} ha`],
              ['Crediting period', `${ce.crediting_years} years`],
              ['Annual rate',      `${ce.annual_rate_tco2e_per_ha} tCO₂e/ha/yr`],
              ['Net units',        `${ce.net_units_tco2e?.toLocaleString()} tCO₂e`],
              ['Confidence',       ce.confidence_band],
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
                <span>{label} · £{price}/t</span>
                <strong>£{val?.toLocaleString()}</strong>
                <small>£{Math.round(val / ce.crediting_years).toLocaleString()} / yr</small>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="Recommended next steps">
        <ol className="steps-list">
          {next_steps.length > 0
            ? next_steps.map((s, i) => <li key={i}>{s}</li>)
            : <li>Run a scan to generate recommended next steps.</li>}
        </ol>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={() => setScreen('partner')}>
            <Handshake size={14} /> Proceed to partner review
          </button>
          <button className="btn btn-secondary" onClick={handleDownloadPDF} disabled={pdfLoading}>
            {pdfLoading ? <><Loader size={13} className="spin" /> Generating…</> : <><Download size={13} /> Download PDF</>}
          </button>
        </div>
      </Card>

      <Card title="Important disclaimer" className="legal-notice">
        <p>
          This report is a preliminary desktop assessment and does not constitute a validated carbon
          project, verification statement, or guarantee of carbon credit issuance. All volumes and
          values are estimates based on automated analysis of open satellite and soil datasets, and
          have not been independently verified. OHMC acts as a trusted mediator only — it does not
          issue, certify, or underwrite carbon credits. Formal project registration requires
          independent validation by an accredited VVB under the relevant standard.
        </p>
      </Card>
    </div>
  );
}
