import { useState } from 'react';
import { Map, MapPin, ExternalLink } from 'lucide-react';
import BoundaryMap from './BoundaryMap.jsx';

// Boundary map + provenance panel shared by Eligibility and Report screens.
// Scans reopened from history have no stored geometry — the map and vertex
// table degrade gracefully to centroid-only display.
export default function BoundaryPanel({ scanResult }) {
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
      {geojson && (
        <div className="bp-map-col">
          <BoundaryMap
            readOnly
            geojson={geojson}
            initialCenter={centLat && centLon ? [centLat, centLon] : [57.0, -4.0]}
            initialZoom={12}
          />
          <div className="bp-map-caption">
            Drawn boundary · {coords.length} vertices · {area_ha} ha
          </div>
        </div>
      )}

      <div className="bp-info-col">
        <div className="bp-section">
          <div className="bp-section-title"><MapPin size={13} /> Location</div>
          <div className="bp-location-name">{placeName || 'Stored scan — location name unavailable'}</div>
          {centLat != null && centLon != null && (
            <div className="bp-coords-row">
              <span>Centroid</span>
              <code>{Number(centLat).toFixed(6)}, {Number(centLon).toFixed(6)}</code>
              {gmapsUrl && (
                <a href={gmapsUrl} target="_blank" rel="noopener noreferrer" className="bp-gmaps-link">
                  Google Maps <ExternalLink size={11} />
                </a>
              )}
            </div>
          )}
        </div>

        {coords.length > 0 && (
          <div className="bp-section">
            <div className="bp-section-title"><Map size={13} /> Boundary vertices</div>
            <div className="bp-coord-table-wrap">
              <table className="data-table compact">
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
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAll(v => !v)}>
                {showAll ? 'Show less' : `Show all ${coords.length} points`}
              </button>
            )}
          </div>
        )}

        <div className="bp-section">
          <div className="bp-section-title">Data sources used</div>
          <div className="bp-source-list">
            <div className="bp-source-row">
              <span className="bp-source-dot" style={{ background: 'var(--teal-600)' }} />
              <div>
                <strong>Sentinel-2 L2A</strong>
                <span>{si?.data_source || 'Element84 STAC / AWS'}</span>
                {si?.acquisition_date && <span>Scene date: {si.acquisition_date}</span>}
                {si?.scene_id && <span className="bp-scene-id">ID: {si.scene_id}</span>}
                {si?.cloud_cover != null && <span>Cloud cover: {Number(si.cloud_cover).toFixed(1)}%</span>}
              </div>
            </div>
            <div className="bp-source-row">
              <span className="bp-source-dot" style={{ background: 'var(--blue-600)' }} />
              <div>
                <strong>SoilGrids v2.0</strong>
                <span>{sd?.data_source || 'ISRIC World Soil Information'}</span>
                {centLat != null && centLon != null && (
                  <span>Query point: {Number(centLat).toFixed(4)}°N, {Number(centLon).toFixed(4)}°E</span>
                )}
              </div>
            </div>
            <div className="bp-source-row">
              <span className="bp-source-dot" style={{ background: 'var(--violet-600)' }} />
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
