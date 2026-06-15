import { useState } from 'react';
import {
  Map, FileText, ChevronDown, ArrowRight, AlertTriangle
} from 'lucide-react';
import {
  PageHeader, Card, Badge, StatRow, Disclaimer, EmptyState, ScoreRing,
  pathwayLabel, confidenceTone
} from '../components/ui.jsx';
import BoundaryPanel from '../components/BoundaryPanel.jsx';

export default function EligibilityPage({ setScreen, scanResult }) {
  const [rulesOpen, setRulesOpen] = useState({ wcc: true, peat: true });

  if (!scanResult) {
    return (
      <div className="page">
        <PageHeader title="Eligibility" subtitle="Satellite-backed assessment results." />
        <Card>
          <EmptyState
            icon={Map}
            title="No scan results yet"
            body="Draw a boundary on the map and run an eligibility scan to see your results here."
            action={
              <button className="btn btn-primary" onClick={() => setScreen('boundary')}>
                <Map size={14} /> Go to scanner
              </button>
            }
          />
        </Card>
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

  // Banded verdict (go / investigate / no-go) — never a bare score
  const band = scanResult.eligibility_band || mlScores.eligibility_band ||
    (score >= 65 ? 'eligible' : score >= 40 ? 'investigate' : 'not_eligible');
  const gateReasons     = scanResult.gate_reasons || mlScores.gate_reasons || [];
  const confFactors     = mlScores.confidence_factors || [];
  const bandLabel = band === 'eligible' ? 'Likely eligible'
    : band === 'investigate' ? 'Worth investigating' : 'Not currently eligible';
  const bandBlurb = band === 'eligible'
    ? 'This parcel shows strong signals for UK carbon standard requirements.'
    : band === 'investigate'
    ? 'Mixed signals — a closer look is needed before proceeding.'
    : 'This parcel does not currently meet the hard requirements of either UK scheme.';
  const bandTone = band === 'eligible' ? 'green' : band === 'investigate' ? 'amber' : 'red';

  return (
    <div className="page">
      <PageHeader
        title="Eligibility results"
        subtitle={`${land_name}${placeName ? ` · ${placeName}` : ''} · ${area_ha} ha${ptMs ? ` · processed in ${(ptMs / 1000).toFixed(1)}s` : ''}`}
        action={
          <div className="btn-row">
            <button className="btn btn-secondary" onClick={() => setScreen('report')}><FileText size={13} /> Full report</button>
            <button className="btn btn-primary" onClick={() => setScreen('boundary')}><Map size={13} /> New scan</button>
          </div>
        }
      />
      <Disclaimer />

      {/* Score summary */}
      <div className="score-hero">
        <ScoreRing score={score} />
        <div className="score-meta">
          <h2>{bandLabel}</h2>
          <p>{bandBlurb}</p>
          <div className="score-badges">
            <Badge tone={bandTone}>{bandLabel}</Badge>
            <Badge tone={pathway === 'peatland' ? 'amber' : pathway === 'wcc' ? 'green' : 'gray'}>{pathwayLabel(pathway)}</Badge>
            <Badge tone={confidenceTone(confidence)}>{confidence} confidence</Badge>
          </div>
          {gateReasons.length > 0 && (
            <ul className="gate-reasons">
              {gateReasons.map(r => <li key={r}><AlertTriangle size={12} /> {r}</li>)}
            </ul>
          )}
          {confFactors.length > 0 && (
            <p className="conf-note">Confidence reflects data quality: {confFactors.join('; ')}.</p>
          )}
          {(mlScores.anomaly_flags || []).length > 0 && (
            <ul className="integrity-flags">
              {mlScores.anomaly_flags.map(f => <li key={f}><AlertTriangle size={12} /> {f}</li>)}
            </ul>
          )}
        </div>
        <div className="score-summary">
          <StatRow label="Area assessed" value={`${area_ha} ha`} />
          <StatRow label="Recommended pathway" value={pathwayLabel(pathway)} badge tone={pathway === 'peatland' ? 'amber' : pathway === 'wcc' ? 'green' : 'gray'} />
          <StatRow label="Model confidence" value={confidence} badge tone={confidenceTone(confidence)} />
          {mlScores.peatland_condition && <StatRow label="Peatland condition" value={mlScores.peatland_condition} badge tone="blue" />}
        </div>
      </div>

      {/* Boundary */}
      <Card title="Assessed land boundary">
        <BoundaryPanel scanResult={scanResult} />
      </Card>

      {/* Data cards */}
      <div className="results-grid">
        <Card title="Satellite indices — Sentinel-2 L2A">
          <p className="data-source">{si?.data_source}{si?.acquisition_date ? ` · ${si.acquisition_date}` : ''}{si?.cloud_cover != null ? ` · ${Number(si.cloud_cover).toFixed(1)}% cloud` : ''}</p>
          {si?.ndvi != null ? (
            <div className="index-grid">
              {[['NDVI', si?.ndvi, 'Vegetation density'], ['NDWI', si?.ndwi, 'Wetness'], ['NDMI', si?.ndmi, 'Moisture'], ['BSI', si?.bare_soil_index, 'Bare soil']].filter(([, v]) => v != null).map(([n, v, d]) => (
                <div key={n} className="index-item">
                  <span className="index-name">{n}</span>
                  <span className="index-val">{Number(v).toFixed(3)}</span>
                  <div className="index-bar"><div className="index-fill" style={{ width: `${((v + 1) / 2) * 100}%` }} /></div>
                  <span className="index-desc">{d}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="notice warn"><AlertTriangle size={13} />No satellite data returned — draw a boundary inside the UK and retry.</div>
          )}
        </Card>

        <Card title="Soil properties — SoilGrids v2.0">
          <p className="data-source">{sd?.data_source || 'ISRIC World Soil Information'}</p>
          <StatRow label="Organic carbon" value={sd?.organic_carbon_g_per_kg != null ? `${sd.organic_carbon_g_per_kg} g/kg` : 'N/A'} />
          <StatRow label="Bulk density"   value={sd?.bulk_density_kg_per_m3 != null ? `${sd.bulk_density_kg_per_m3} kg/m³` : 'N/A'} />
          <StatRow label="pH"             value={sd?.ph != null ? sd.ph : 'N/A'} />
          <StatRow label="Soil class"
            value={(sd?.peat_status === 'deep_peat_likely' || sd?.is_peat) ? 'Deep peat likely — depth survey needed'
              : (sd?.peat_status === 'organic_peaty' || sd?.is_peaty) ? 'Organic / peaty — depth survey needed'
              : 'Mineral soil'}
            badge tone={(sd?.peat_status === 'deep_peat_likely' || sd?.is_peat) ? 'amber'
              : (sd?.peat_status === 'organic_peaty' || sd?.is_peaty) ? 'blue' : 'gray'} />
          {sd?.requires_peat_depth_survey && (
            <p className="conf-note">{sd?.peat_note || 'SOC is a topsoil proxy — peat depth must be confirmed by survey.'}</p>
          )}
        </Card>

        <Card title="Land cover — spectral classification">
          <p className="data-source">{lc?.data_source || 'UKCEH LCM2023'}</p>
          <StatRow label="Dominant class" value={lc?.dominant_class || 'N/A'} badge tone="gray" />
          {[['Peatland / heather', lc?.peatland_fraction], ['Woodland', lc?.woodland_fraction], ['Grassland', lc?.grassland_fraction]].map(([l, f]) => (
            <div key={l} className="cover-row">
              <span>{l}</span>
              <div className="cover-bar"><div className="cover-fill" style={{ width: `${(f ?? 0) * 100}%` }} /></div>
              <span className="cover-pct">{((f ?? 0) * 100).toFixed(0)}%</span>
            </div>
          ))}
        </Card>

        <Card title="Model assessment">
          <StatRow label="Eligibility score" value={`${mlScores.eligibility_score ?? score} / 100`} />
          <StatRow label="Confidence" value={mlScores.confidence_level || confidence} badge tone={confidenceTone(mlScores.confidence_level || confidence)} />
          {mlScores.peatland_condition && <StatRow label="Peatland condition" value={mlScores.peatland_condition} badge tone="blue" />}
          {mlScores.woodland_suitability != null && <StatRow label="Woodland suitability" value={`${(mlScores.woodland_suitability * 100).toFixed(0)}%`} />}
        </Card>
      </div>

      {/* Rules */}
      <div className="rules-section">
        {[['Woodland Carbon Code rules', wccRules, 'wcc'], ['Peatland Code rules', peatRules, 'peat']].map(([title, rules, key]) => (
          <Card key={key} className="rules-card">
            <button className="rules-toggle" onClick={() => setRulesOpen(p => ({ ...p, [key]: !p[key] }))}>
              <span>{title}</span>
              <span className="rules-count">{rules.filter(r => r?.passed).length}/{rules.length} passed</span>
              <ChevronDown size={15} className={rulesOpen[key] ? 'rotated' : ''} />
            </button>
            {rulesOpen[key] && (
              <div className="rules-body">
                {rules.length === 0
                  ? <p className="rules-empty">No rule data available.</p>
                  : rules.map((r, i) => (
                    <div key={i} className={`rule-row ${r?.passed ? 'pass' : 'fail'}`}>
                      <span className="rule-icon">{r?.passed ? '✓' : '✕'}</span>
                      <div><strong>{r?.rule}</strong><small>{r?.value}{r?.note ? ` — ${r.note}` : ''}</small></div>
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
        <Card title="Carbon estimate — deterministic model, pre-screening only">
          <div className="estimate-grid">
            {[['Pathway', ce.pathway === 'peatland' ? 'Peatland Code' : 'WCC'], ['Eligible area', `${ce.eligible_area_ha} ha`],
              ['Crediting period', `${ce.crediting_years} years`], ['Annual rate', `${ce.annual_rate_tco2e_per_ha} tCO₂e/ha/yr`],
              ['Net units', `${ce.net_units_tco2e?.toLocaleString()} tCO₂e`], ['Confidence', ce.confidence_band]].map(([k, v]) => (
              <div key={k} className="estimate-item"><span>{k}</span><strong>{v}</strong></div>
            ))}
          </div>
          <div className="value-range">
            {[['low', 'Low', ce.price_low, ce.low_value_gbp], ['mid', 'Mid', ce.price_mid, ce.mid_value_gbp], ['high', 'High', ce.price_high, ce.high_value_gbp]].map(([cls, label, price, val]) => (
              <div key={cls} className={`value-col ${cls}`}>
                <span>{label} · £{price}/t</span>
                <strong>£{val?.toLocaleString()}</strong>
              </div>
            ))}
          </div>
          {ce.assumptions?.note && <p className="conf-note">Assumptions: {ce.assumptions.note}</p>}
          <button className="btn btn-primary" onClick={() => setScreen('report')}>View full report <ArrowRight size={14} /></button>
        </Card>
      )}

      <Card title="Recommended next steps">
        <ol className="steps-list">
          {nextSteps.length > 0
            ? nextSteps.map((s, i) => <li key={i}>{s}</li>)
            : <li>Run a scan to see recommended next steps.</li>}
        </ol>
      </Card>
    </div>
  );
}
