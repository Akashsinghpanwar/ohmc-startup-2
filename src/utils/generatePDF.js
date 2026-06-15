import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Colours ────────────────────────────────────────────────────────────────────
// Brand chrome = teal/forest; GREEN is reserved for status (pass, high score).
const GREEN   = [22, 163, 74];   // #16a34a — status only
const TEAL    = [15, 118, 110];  // #0f766e — brand accent
const FOREST  = [6, 78, 59];     // #064e3b — header/footer bands
const TEAL200 = [153, 246, 228]; // #99f6e4 — text on forest bands
const TEAL50  = [240, 253, 250]; // #f0fdfa — highlight boxes
const DGREEN  = FOREST;          // legacy alias
const NAVY   = [15, 23, 42];    // #0f172a
const SLATE  = [100, 116, 139]; // #64748b
const WHITE  = [255, 255, 255];
const LGRAY  = [241, 245, 249]; // #f1f5f9
const MGRAY  = [226, 232, 240]; // #e2e8f0
const AMBER  = [217, 119, 6];   // #d97706
const BLUE   = [37, 99, 235];   // #2563eb

// ── Helpers ────────────────────────────────────────────────────────────────────
function setFont(doc, size, style = 'normal', color = NAVY) {
  doc.setFontSize(size);
  doc.setFont('helvetica', style);
  doc.setTextColor(...color);
}

function filled(doc, x, y, w, h, rgb) {
  doc.setFillColor(...rgb);
  doc.rect(x, y, w, h, 'F');
}

function ruled(doc, x, y, w, rgb = MGRAY, thickness = 0.3) {
  doc.setDrawColor(...rgb);
  doc.setLineWidth(thickness);
  doc.line(x, y, x + w, y);
}

function badge(doc, x, y, text, bg, fg = WHITE) {
  const tw = (doc.getStringUnitWidth(text) * 8) / doc.internal.scaleFactor + 6;
  doc.setFillColor(...bg);
  doc.roundedRect(x, y - 4.5, tw, 6, 1.5, 1.5, 'F');
  setFont(doc, 7, 'bold', fg);
  doc.text(text, x + 3, y);
}

function scoreRing(doc, cx, cy, score) {
  const r = 14;
  // background ring
  doc.setDrawColor(...MGRAY);
  doc.setLineWidth(2.5);
  doc.circle(cx, cy, r, 'S');
  // coloured arc approximation — fill ring based on score
  const col = score >= 70 ? GREEN : score >= 45 ? AMBER : [220, 38, 38];
  doc.setDrawColor(...col);
  doc.setLineWidth(2.5);
  // draw arc as multiple segments
  const total = (score / 100) * 2 * Math.PI;
  const steps = 60;
  for (let i = 0; i < steps; i++) {
    const a1 = -Math.PI / 2 + (i / steps) * total;
    const a2 = -Math.PI / 2 + ((i + 1) / steps) * total;
    doc.line(
      cx + r * Math.cos(a1), cy + r * Math.sin(a1),
      cx + r * Math.cos(a2), cy + r * Math.sin(a2),
    );
  }
  // score number
  setFont(doc, 18, 'bold', col);
  const sw = doc.getStringUnitWidth(String(score)) * 18 / doc.internal.scaleFactor;
  doc.text(String(score), cx - sw / 2, cy + 3);
  setFont(doc, 7, 'normal', SLATE);
  doc.text('/ 100', cx - 5, cy + 9);
}

// ── Logo loader ────────────────────────────────────────────────────────────────
async function loadLogoBase64() {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = '/src/assets/logo.png';
  });
}

// ── Page footer ────────────────────────────────────────────────────────────────
function addFooter(doc, pageNum, totalPages, refId) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  filled(doc, 0, H - 10, W, 10, DGREEN);
  setFont(doc, 7, 'normal', WHITE);
  doc.text(`OHMC CarbonOS · Preliminary Assessment Report · ${refId}`, 10, H - 4);
  doc.text(`Page ${pageNum} of ${totalPages}`, W - 22, H - 4);
}

// ── Section heading ────────────────────────────────────────────────────────────
function sectionHead(doc, y, title) {
  const W = doc.internal.pageSize.getWidth();
  filled(doc, 10, y, W - 20, 7, LGRAY);
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.6);
  doc.line(10, y, 10, y + 7);
  setFont(doc, 9, 'bold', NAVY);
  doc.text(title, 15, y + 5);
  return y + 11;
}

// ── Main export ────────────────────────────────────────────────────────────────
export async function generateEligibilityPDF(scanResult) {
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W    = doc.internal.pageSize.getWidth();   // 210
  const H    = doc.internal.pageSize.getHeight();  // 297
  const M    = 14;  // margin
  const CW   = W - M * 2;

  const refId = `OHMC-RPT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const genDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const {
    land_name           = 'Unknown Parcel',
    area_ha             = 0,
    eligibility_score   = 0,
    confidence          = 'unknown',
    recommended_pathway = '',
    processing_time_ms  = 0,
    centroid_lat,
    centroid_lon,
    place_name          = '',
    boundary_coordinates = [],
    sentinel_indices: si = {},
    soil_data: sd        = {},
    land_cover: lc       = {},
    wcc_rules            = [],
    peatland_rules       = [],
    carbon_estimate: ce  = null,
    ml_scores            = {},
    next_steps           = [],
  } = scanResult;

  const pathwayLabel = recommended_pathway === 'peatland' ? 'Peatland Code'
    : recommended_pathway === 'wcc' ? 'Woodland Carbon Code' : 'No clear pathway';

  const logoB64 = await loadLogoBase64();
  let pages = [];  // will be filled after we know page count

  // ─────────────────────────────────────────────────────────────────────────────
  // PAGE 1 — COVER
  // ─────────────────────────────────────────────────────────────────────────────
  // Dark green header band
  filled(doc, 0, 0, W, 52, DGREEN);

  // Logo
  if (logoB64) {
    try { doc.addImage(logoB64, 'PNG', M, 8, 28, 28, undefined, 'FAST'); }
    catch {}
  }

  // Company name beside logo
  setFont(doc, 18, 'bold', WHITE);
  doc.text('OHMC CarbonOS', M + 33, 20);
  setFont(doc, 9, 'normal', TEAL200);
  doc.text('Carbon Eligibility & Opportunity Report', M + 33, 28);
  setFont(doc, 7.5, 'normal', TEAL200);
  doc.text('Voluntary Carbon Market · UK & Scotland', M + 33, 35);

  // Ref + date — top right
  setFont(doc, 7, 'normal', TEAL200);
  doc.text(refId, W - M - doc.getStringUnitWidth(refId) * 7 / doc.internal.scaleFactor, 14);
  doc.text(genDate, W - M - doc.getStringUnitWidth(genDate) * 7 / doc.internal.scaleFactor, 21);

  // Decorative brand stripe
  filled(doc, 0, 52, W, 3, TEAL);

  // Parcel info block
  let y = 68;
  setFont(doc, 22, 'bold', NAVY);
  doc.text(land_name, M, y);
  y += 8;
  setFont(doc, 10, 'normal', SLATE);
  doc.text(`Carbon Eligibility Assessment · ${area_ha} hectares`, M, y);
  y += 6;
  setFont(doc, 8, 'normal', SLATE);
  doc.text(`Generated: ${genDate}   ·   Reference: ${refId}   ·   Valid 90 days`, M, y);

  ruled(doc, M, y + 5, CW, MGRAY, 0.4);
  y += 14;

  // Score ring + summary box side by side
  const boxY = y;

  // Left — score ring
  scoreRing(doc, M + 22, boxY + 22, eligibility_score);
  setFont(doc, 8, 'normal', SLATE);
  const eligLabel = eligibility_score >= 70 ? 'High Eligibility'
    : eligibility_score >= 45 ? 'Moderate Eligibility' : 'Low Eligibility';
  doc.text(eligLabel, M + 8, boxY + 42);

  // Right — key stats grid
  const statX = M + 52;
  const stats = [
    ['Area Assessed',      `${area_ha} ha`],
    ['Eligibility Score',  `${eligibility_score} / 100`],
    ['Confidence',         confidence],
    ['Recommended Pathway', pathwayLabel],
    ['Acquisition Date',   si?.acquisition_date || 'N/A'],
    ['Processing Time',    `${processing_time_ms} ms`],
  ];
  stats.forEach(([lbl, val], i) => {
    const col = i % 2 === 0 ? statX : statX + 75;
    const row = boxY + Math.floor(i / 2) * 10;
    setFont(doc, 7, 'normal', SLATE);
    doc.text(lbl, col, row + 2);
    setFont(doc, 8.5, 'bold', NAVY);
    doc.text(val, col, row + 8);
  });

  y = boxY + 46;
  ruled(doc, M, y, CW, MGRAY, 0.4);
  y += 8;

  // Place name + centroid
  if (place_name) {
    setFont(doc, 9, 'bold', NAVY);
    doc.text(place_name, M, y);
    y += 6;
  }
  if (centroid_lat && centroid_lon) {
    setFont(doc, 7.5, 'normal', SLATE);
    doc.text(`Centroid: ${centroid_lat.toFixed(6)}°N, ${centroid_lon.toFixed(6)}°E  ·  ${boundary_coordinates.length} boundary vertices  ·  Area: ${area_ha} ha`, M, y);
    y += 8;
  }

  // Pathway badge
  const pathCol = recommended_pathway === 'peatland' ? AMBER
    : recommended_pathway === 'wcc' ? GREEN : SLATE;
  badge(doc, M, y, pathwayLabel.toUpperCase(), pathCol);
  const confCol = confidence === 'high' ? GREEN : confidence === 'medium' ? AMBER : SLATE;
  badge(doc, M + 50, y, `CONFIDENCE: ${confidence.toUpperCase()}`, confCol);
  y += 10;

  // Carbon estimate headline
  if (ce) {
    filled(doc, M, y, CW, 30, TEAL50);
    doc.setDrawColor(...TEAL);
    doc.setLineWidth(0.4);
    doc.rect(M, y, CW, 30, 'S');

    setFont(doc, 8, 'bold', TEAL);
    doc.text('INDICATIVE CARBON VALUE (PRELIMINARY — NOT VERIFIED)', M + 4, y + 6);
    setFont(doc, 20, 'bold', NAVY);
    doc.text(`${ce.net_units_tco2e?.toLocaleString() || 'N/A'} tCO₂e`, M + 4, y + 18);
    setFont(doc, 9, 'normal', SLATE);
    doc.text(`${ce.crediting_years}-year total · Peat/WCC deterministic model`, M + 4, y + 24);

    setFont(doc, 11, 'bold', NAVY);
    doc.text(`£${ce.low_value_gbp?.toLocaleString() || 'N/A'}`, M + 90, y + 11);
    doc.text(`£${ce.mid_value_gbp?.toLocaleString() || 'N/A'}`, M + 120, y + 11);
    doc.text(`£${ce.high_value_gbp?.toLocaleString() || 'N/A'}`, M + 152, y + 11);
    setFont(doc, 7, 'normal', SLATE);
    doc.text('Low (£' + ce.price_low + '/t)', M + 90, y + 18);
    doc.text('Mid (£' + ce.price_mid + '/t)', M + 120, y + 18);
    doc.text('High (£' + ce.price_high + '/t)', M + 152, y + 18);
    y += 36;
  }

  // Cover disclaimer
  y += 4;
  filled(doc, M, y, CW, 20, [255, 251, 235]);
  doc.setDrawColor(...AMBER);
  doc.setLineWidth(0.4);
  doc.rect(M, y, CW, 20, 'S');
  setFont(doc, 7, 'bold', AMBER);
  doc.text('IMPORTANT DISCLAIMER', M + 4, y + 6);
  setFont(doc, 6.5, 'normal', [92, 45, 0]);
  const discText = doc.splitTextToSize(
    'This report is a preliminary desktop assessment only. It does not constitute a validated carbon project, verification statement, or guarantee of carbon credit issuance. All volumes and values are estimates based on automated analysis of open satellite and soil datasets and have not been independently verified. OHMC acts as a trusted mediator only — it does not issue, certify, or underwrite carbon credits.',
    CW - 8,
  );
  doc.text(discText, M + 4, y + 12);

  // ─────────────────────────────────────────────────────────────────────────────
  // PAGE 2 — SATELLITE & SOIL DATA
  // ─────────────────────────────────────────────────────────────────────────────
  doc.addPage();
  y = 18;

  // Header strip
  filled(doc, 0, 0, W, 12, DGREEN);
  if (logoB64) {
    try { doc.addImage(logoB64, 'PNG', M, 1, 10, 10, undefined, 'FAST'); } catch {}
  }
  setFont(doc, 8, 'bold', WHITE);
  doc.text('OHMC CarbonOS  ·  Eligibility Report', M + 14, 8);
  setFont(doc, 7, 'normal', TEAL200);
  doc.text(refId, W - M - 40, 8);

  // Boundary coordinates table (show max 20 pts)
  if (boundary_coordinates.length > 0) {
    y = sectionHead(doc, y, `BOUNDARY COORDINATES — ${boundary_coordinates.length} vertices · ${area_ha} ha · ${place_name || 'Location unknown'}`);
    if (centroid_lat && centroid_lon) {
      setFont(doc, 7.5, 'normal', SLATE);
      doc.text(`Centroid: ${centroid_lat.toFixed(6)}°N, ${centroid_lon.toFixed(6)}°E`, M, y);
      y += 7;
    }
    const displayPts = boundary_coordinates.slice(0, 20);
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [['Point', 'Latitude (°N)', 'Longitude (°E)']],
      body: displayPts.map(c => [String(c.point), c.lat.toFixed(6), c.lon.toFixed(6)]),
      headStyles: { fillColor: DGREEN, textColor: WHITE, fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: NAVY, font: 'courier' },
      columnStyles: { 0: { cellWidth: 15, halign: 'center' }, 1: { cellWidth: 55 }, 2: { cellWidth: 55 } },
      alternateRowStyles: { fillColor: LGRAY },
      theme: 'grid',
    });
    if (boundary_coordinates.length > 20) {
      y = doc.lastAutoTable.finalY + 2;
      setFont(doc, 7, 'italic', SLATE);
      doc.text(`… and ${boundary_coordinates.length - 20} more vertices. Full coordinates in the digital scan record.`, M, y);
    }
    y = (doc.lastAutoTable?.finalY || y) + 10;
  }

  y = sectionHead(doc, y, 'SATELLITE DATA — Sentinel-2 L2A (ESA Copernicus)');

  // Sentinel table
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['Index', 'Value', 'Interpretation', 'Significance']],
    body: [
      ['NDVI (Vegetation)',   si?.ndvi != null ? si.ndvi.toFixed(4) : 'N/A',  si?.ndvi >= 0.6 ? 'Dense vegetation' : si?.ndvi >= 0.3 ? 'Moderate vegetation' : 'Sparse / bare',  'Indicates plant biomass and photosynthetic activity'],
      ['NDWI (Wetness)',      si?.ndwi != null ? si.ndwi.toFixed(4) : 'N/A',  si?.ndwi >= 0.2 ? 'High moisture / wet' : si?.ndwi >= 0 ? 'Moderate moisture' : 'Dry', 'Key peatland indicator — high values suggest rewetting potential'],
      ['NDMI (Moisture)',     si?.ndmi != null ? si.ndmi.toFixed(4) : 'N/A',  si?.ndmi >= 0.1 ? 'Moist canopy' : 'Low canopy moisture', 'Canopy water content — useful for woodland assessment'],
      ['Bare Soil Index',     si?.bare_soil_index != null ? si.bare_soil_index.toFixed(4) : 'N/A', si?.bare_soil_index > 0.1 ? 'Exposed soil present' : 'Vegetated', 'Higher values indicate erosion or low vegetation cover'],
      ['Data Source',         si?.data_source || 'Sentinel-2 L2A', '10m resolution', 'ESA Copernicus Open Access Hub'],
      ['Acquisition Date',    si?.acquisition_date || 'N/A', '—', 'Most recent cloud-free scene'],
      ['Cloud Cover',         si?.cloud_cover != null ? `${si.cloud_cover.toFixed(1)}%` : 'N/A', '—', 'Scene quality indicator'],
    ],
    headStyles: { fillColor: DGREEN, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, textColor: NAVY },
    alternateRowStyles: { fillColor: LGRAY },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 38 }, 1: { cellWidth: 22, halign: 'center' }, 2: { cellWidth: 50 }, 3: { cellWidth: 'auto' } },
    theme: 'grid',
  });

  y = doc.lastAutoTable.finalY + 10;
  y = sectionHead(doc, y, 'SOIL PROPERTIES — SoilGrids v2.0 (ISRIC)');

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['Property', 'Value', 'Threshold', 'Assessment']],
    body: [
      ['Organic Carbon (SOC)', sd?.organic_carbon_g_per_kg != null ? `${sd.organic_carbon_g_per_kg} g/kg` : 'N/A', '≥ 200 g/kg = Deep Peat', sd?.is_peat ? '✓ Qualifies as Deep Peat' : sd?.is_peaty ? 'Peaty mineral soil' : 'Mineral soil'],
      ['Bulk Density', sd?.bulk_density_kg_per_m3 != null ? `${sd.bulk_density_kg_per_m3} kg/m³` : 'N/A', '< 900 kg/m³ typical peat', sd?.bulk_density_kg_per_m3 < 900 ? 'Consistent with peat' : 'Mineral range'],
      ['pH', sd?.ph != null ? String(sd.ph) : 'N/A', '3.5–6.5 peatland', sd?.ph <= 6.5 ? 'Within peatland range' : 'Neutral–alkaline'],
      ['Soil Classification', sd?.is_peat ? 'Deep Peat' : sd?.is_peaty ? 'Peaty Mineral' : 'Mineral', '—', sd?.is_peat ? 'Eligible for Peatland Code' : sd?.is_peaty ? 'May qualify — site assessment required' : 'Likely WCC pathway'],
      ['Data Source', sd?.data_source || 'ISRIC SoilGrids v2.0', '—', '250m resolution global dataset'],
    ],
    headStyles: { fillColor: DGREEN, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, textColor: NAVY },
    alternateRowStyles: { fillColor: LGRAY },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 42 }, 1: { cellWidth: 28, halign: 'center' }, 2: { cellWidth: 42 }, 3: { cellWidth: 'auto' } },
    theme: 'grid',
  });

  y = doc.lastAutoTable.finalY + 10;
  y = sectionHead(doc, y, 'LAND COVER — Spectral Classification');

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['Cover Type', 'Fraction', 'Area (ha)', 'Notes']],
    body: [
      ['Dominant Class', lc?.dominant_class || 'N/A', '—', 'Spectrally dominant land cover type'],
      ['Peatland / Heather', lc?.peatland_fraction != null ? `${(lc.peatland_fraction * 100).toFixed(1)}%` : 'N/A', lc?.peatland_fraction != null ? `${(lc.peatland_fraction * area_ha).toFixed(1)} ha` : 'N/A', 'Eligible for Peatland Code consideration'],
      ['Woodland / Forest',  lc?.woodland_fraction != null ? `${(lc.woodland_fraction * 100).toFixed(1)}%` : 'N/A', lc?.woodland_fraction != null ? `${(lc.woodland_fraction * area_ha).toFixed(1)} ha` : 'N/A', 'Eligible for Woodland Carbon Code'],
      ['Grassland',          lc?.grassland_fraction != null ? `${(lc.grassland_fraction * 100).toFixed(1)}%` : 'N/A', lc?.grassland_fraction != null ? `${(lc.grassland_fraction * area_ha).toFixed(1)} ha` : 'N/A', 'May support mixed project design'],
      ['Data Source',        lc?.data_source || 'UKCEH LCM2023', '—', 'UK Countryside Survey 2023'],
    ],
    headStyles: { fillColor: DGREEN, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, textColor: NAVY },
    alternateRowStyles: { fillColor: LGRAY },
    theme: 'grid',
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PAGE 3 — RULES ASSESSMENT
  // ─────────────────────────────────────────────────────────────────────────────
  doc.addPage();
  y = 18;

  filled(doc, 0, 0, W, 12, DGREEN);
  if (logoB64) {
    try { doc.addImage(logoB64, 'PNG', M, 1, 10, 10, undefined, 'FAST'); } catch {}
  }
  setFont(doc, 8, 'bold', WHITE);
  doc.text('OHMC CarbonOS  ·  Eligibility Report', M + 14, 8);
  setFont(doc, 7, 'normal', TEAL200);
  doc.text(refId, W - M - 40, 8);

  y = sectionHead(doc, y, 'WOODLAND CARBON CODE (WCC) — Eligibility Rules');

  if (wcc_rules.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [['Rule', 'Result', 'Value', 'Notes']],
      body: wcc_rules.map(r => [
        r?.rule || '—',
        r?.passed ? 'PASS' : 'FAIL',
        r?.value || '—',
        r?.note || '—',
      ]),
      headStyles: { fillColor: DGREEN, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5 },
      columnStyles: {
        0: { cellWidth: 60, fontStyle: 'bold' },
        1: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 30 },
        3: { cellWidth: 'auto' },
      },
      didParseCell(data) {
        if (data.column.index === 1) {
          data.cell.styles.textColor = data.cell.raw === 'PASS' ? GREEN : [220, 38, 38];
        }
      },
      alternateRowStyles: { fillColor: LGRAY },
      theme: 'grid',
    });
    const wccPassed = wcc_rules.filter(r => r?.passed).length;
    y = doc.lastAutoTable.finalY + 2;
    const wccPct = Math.round((wccPassed / wcc_rules.length) * 100);
    badge(doc, M, y + 4, `${wccPassed}/${wcc_rules.length} rules passed (${wccPct}%)`, wccPct >= 70 ? GREEN : wccPct >= 50 ? AMBER : [220, 38, 38]);
    y += 12;
  } else {
    setFont(doc, 8, 'normal', SLATE);
    doc.text('No WCC rule data available for this scan.', M, y + 6);
    y += 14;
  }

  y = sectionHead(doc, y, 'PEATLAND CODE — Eligibility Rules');

  if (peatland_rules.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [['Rule', 'Result', 'Value', 'Notes']],
      body: peatland_rules.map(r => [
        r?.rule || '—',
        r?.passed ? 'PASS' : 'FAIL',
        r?.value || '—',
        r?.note || '—',
      ]),
      headStyles: { fillColor: [146, 64, 14], textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5 },
      columnStyles: {
        0: { cellWidth: 60, fontStyle: 'bold' },
        1: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 30 },
        3: { cellWidth: 'auto' },
      },
      didParseCell(data) {
        if (data.column.index === 1) {
          data.cell.styles.textColor = data.cell.raw === 'PASS' ? GREEN : [220, 38, 38];
        }
      },
      alternateRowStyles: { fillColor: [255, 251, 235] },
      theme: 'grid',
    });
    const peatPassed = peatland_rules.filter(r => r?.passed).length;
    y = doc.lastAutoTable.finalY + 2;
    const peatPct = Math.round((peatPassed / peatland_rules.length) * 100);
    badge(doc, M, y + 4, `${peatPassed}/${peatland_rules.length} rules passed (${peatPct}%)`, peatPct >= 70 ? GREEN : peatPct >= 50 ? AMBER : [220, 38, 38]);
    y += 12;
  } else {
    setFont(doc, 8, 'normal', SLATE);
    doc.text('No Peatland Code rule data available for this scan.', M, y + 6);
    y += 14;
  }

  // ML Assessment
  if (Object.keys(ml_scores).length > 0) {
    y = sectionHead(doc, y, 'ML ASSESSMENT — LightGBM + Random Forest');
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [['Model Output', 'Value']],
      body: [
        ['Eligibility Score',    `${ml_scores.eligibility_score ?? eligibility_score} / 100`],
        ['Confidence Level',     ml_scores.confidence_level || confidence],
        ['Peatland Condition',   ml_scores.peatland_condition || 'N/A'],
        ['Woodland Suitability', ml_scores.woodland_suitability != null ? `${(ml_scores.woodland_suitability * 100).toFixed(0)}%` : 'N/A'],
      ],
      headStyles: { fillColor: [109, 40, 217], textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: NAVY },
      columnStyles: { 0: { cellWidth: 70, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
      alternateRowStyles: { fillColor: [245, 243, 255] },
      theme: 'grid',
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PAGE 4 — CARBON ESTIMATE & NEXT STEPS
  // ─────────────────────────────────────────────────────────────────────────────
  doc.addPage();
  y = 18;

  filled(doc, 0, 0, W, 12, DGREEN);
  if (logoB64) {
    try { doc.addImage(logoB64, 'PNG', M, 1, 10, 10, undefined, 'FAST'); } catch {}
  }
  setFont(doc, 8, 'bold', WHITE);
  doc.text('OHMC CarbonOS  ·  Eligibility Report', M + 14, 8);
  setFont(doc, 7, 'normal', TEAL200);
  doc.text(refId, W - M - 40, 8);

  if (ce) {
    y = sectionHead(doc, y, 'CARBON ESTIMATE — Deterministic Model (Pre-screening only)');

    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [['Parameter', 'Value']],
      body: [
        ['Recommended Pathway',      ce.pathway === 'peatland' ? 'Peatland Code' : 'Woodland Carbon Code'],
        ['Eligible Area',            `${ce.eligible_area_ha} ha`],
        ['Crediting Period',         `${ce.crediting_years} years`],
        ['Annual Rate',              `${ce.annual_rate_tco2e_per_ha} tCO₂e / ha / year`],
        ['Net Carbon Units',         `${ce.net_units_tco2e?.toLocaleString()} tCO₂e`],
        ['Confidence Band',          ce.confidence_band],
      ],
      headStyles: { fillColor: DGREEN, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: NAVY },
      columnStyles: { 0: { cellWidth: 70, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
      alternateRowStyles: { fillColor: LGRAY },
      theme: 'grid',
    });

    y = doc.lastAutoTable.finalY + 8;
    y = sectionHead(doc, y, 'INDICATIVE FINANCIAL PROJECTIONS (Gross — Before costs & verification)');

    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [['Scenario', 'Price / tCO₂e', `Total (${ce.crediting_years} yrs)`, 'Annual Average']],
      body: [
        ['Low  estimate',  `£${ce.price_low}`,  `£${ce.low_value_gbp?.toLocaleString()}`,  `£${Math.round(ce.low_value_gbp / ce.crediting_years).toLocaleString()}`],
        ['Mid  estimate',  `£${ce.price_mid}`,  `£${ce.mid_value_gbp?.toLocaleString()}`,  `£${Math.round(ce.mid_value_gbp / ce.crediting_years).toLocaleString()}`],
        ['High estimate',  `£${ce.price_high}`, `£${ce.high_value_gbp?.toLocaleString()}`, `£${Math.round(ce.high_value_gbp / ce.crediting_years).toLocaleString()}`],
      ],
      headStyles: { fillColor: DGREEN, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9, textColor: NAVY },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 38 },
        1: { halign: 'center', cellWidth: 30 },
        2: { halign: 'right', fontStyle: 'bold', cellWidth: 50 },
        3: { halign: 'right', cellWidth: 'auto' },
      },
      didParseCell(data) {
        if (data.row.index === 1 && data.section === 'body') {
          data.cell.styles.fillColor = TEAL50;
          data.cell.styles.textColor = DGREEN;
        }
      },
      theme: 'grid',
    });

    y = doc.lastAutoTable.finalY + 4;
    filled(doc, M, y, CW, 8, [255, 251, 235]);
    setFont(doc, 6.5, 'italic', AMBER);
    doc.text('Note: Projections are indicative gross values before deductions (verification costs, buffer pools, transaction fees, landowner costs). Mid scenario highlighted.', M + 3, y + 5);
    y += 14;
  }

  y = sectionHead(doc, y, 'RECOMMENDED NEXT STEPS');

  if (next_steps.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [['#', 'Action Required']],
      body: next_steps.map((s, i) => [String(i + 1), s]),
      headStyles: { fillColor: DGREEN, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: NAVY },
      columnStyles: { 0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
      alternateRowStyles: { fillColor: LGRAY },
      theme: 'grid',
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // Contact box
  filled(doc, M, y, CW, 32, TEAL50);
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.5);
  doc.rect(M, y, CW, 32, 'S');
  setFont(doc, 9, 'bold', FOREST);
  doc.text('Next Step — Contact OHMC', M + 6, y + 8);
  setFont(doc, 8, 'normal', NAVY);
  doc.text('OHMC acts as your trusted mediator throughout the credit origination process.', M + 6, y + 15);
  doc.text('We connect you with accredited VVBs, buyers, and technical partners.', M + 6, y + 21);
  setFont(doc, 8, 'bold', TEAL);
  doc.text('hello@ohmc.co.uk  ·  www.ohmc.co.uk', M + 6, y + 28);
  y += 38;

  // Full disclaimer
  y = sectionHead(doc, y, 'LEGAL DISCLAIMER');
  setFont(doc, 6.5, 'normal', SLATE);
  const legalText = doc.splitTextToSize(
    'This report is a preliminary desktop assessment produced by OHMC CarbonOS automated analysis software. It does not constitute a validated carbon project, verification statement, or guarantee of carbon credit issuance under any standard including the Woodland Carbon Code, Peatland Code, Verra VCS, or Gold Standard. All carbon volumes, financial values, and eligibility assessments are estimates based on automated analysis of open satellite and soil datasets (Sentinel-2 L2A, SoilGrids v2.0, UKCEH LCM2023) and have not been independently verified. OHMC acts as a trusted mediator only — it does not issue, certify, manage, or underwrite carbon credits. Formal project registration requires independent validation and verification by an accredited Validation and Verification Body (VVB). Landowners and buyers should seek independent professional advice before making investment or land management decisions based on this report.',
    CW - 8,
  );
  doc.text(legalText, M + 4, y);

  // ─────────────────────────────────────────────────────────────────────────────
  // Add footers to all pages
  // ─────────────────────────────────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    addFooter(doc, p, totalPages, refId);
  }

  // Save
  const filename = `OHMC-Report-${land_name.replace(/[^a-z0-9]/gi, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  return filename;
}
