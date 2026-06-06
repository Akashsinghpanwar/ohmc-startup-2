import { useEffect, useRef, useState, useCallback } from 'react';

let L = null;
function loadLeaflet() {
  if (L) return Promise.resolve(L);
  return import('leaflet').then(mod => {
    L = mod.default || mod;
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
    return L;
  });
}

const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATT = '© <a href="https://openstreetmap.org">OpenStreetMap</a>';
const SAT_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const SAT_ATT = 'Tiles © Esri';

export default function BoundaryMap({
  onBoundaryChange,
  initialCenter = [57.0, -4.0],
  initialZoom = 7,
  readOnly = false,
  geojson = null,
}) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const layerRef     = useRef(null);
  const tileLayers   = useRef({});

  const [points,      setPoints]      = useState([]);
  const [isSatellite, setIsSatellite] = useState(false);

  const isClosed = points.length > 3 &&
    points[0][0] === points[points.length - 1][0] &&
    points[0][1] === points[points.length - 1][1];

  // ── Init map ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    loadLeaflet().then(leaf => {
      const map = leaf.map(containerRef.current, {
        center: initialCenter, zoom: initialZoom, zoomControl: true,
      });
      const osm = leaf.tileLayer(OSM_URL, { attribution: OSM_ATT, maxZoom: 19 });
      const sat = leaf.tileLayer(SAT_URL, { attribution: SAT_ATT, maxZoom: 19 });
      osm.addTo(map);
      tileLayers.current = { osm, sat };
      layerRef.current   = leaf.layerGroup().addTo(map);
      mapRef.current     = map;

      if (geojson) {
        const gl = leaf.geoJSON(geojson, {
          style: { color: '#16a34a', weight: 2, fillOpacity: 0.15 },
        }).addTo(map);
        map.fitBounds(gl.getBounds(), { padding: [30, 30] });
      }

      if (!readOnly) {
        map.on('click', e => {
          setPoints(prev => {
            if (prev.length > 3 && prev[0][0] === prev[prev.length - 1][0]) return prev;
            return [...prev, [e.latlng.lat, e.latlng.lng]];
          });
        });
      }
    });
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  // ── Render drawing ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !layerRef.current || !L) return;
    layerRef.current.clearLayers();
    if (points.length === 0) return;

    const closed = points.length > 3 &&
      points[0][0] === points[points.length - 1][0];

    if (closed) {
      L.polygon(points, {
        color: '#16a34a', weight: 2.5, fillColor: '#16a34a', fillOpacity: 0.15,
      }).addTo(layerRef.current);
      const geo = { type: 'Polygon', coordinates: [points.map(p => [p[1], p[0]])] };
      onBoundaryChange?.(geo);
    } else {
      if (points.length > 1)
        L.polyline(points, { color: '#16a34a', weight: 2.5, dashArray: '8 5' }).addTo(layerRef.current);
      points.forEach((pt, i) => {
        L.circleMarker(pt, {
          radius: i === 0 ? 8 : 5,
          color: '#16a34a',
          fillColor: i === 0 ? '#16a34a' : '#fff',
          fillOpacity: 1, weight: 2,
        }).addTo(layerRef.current);
      });
      if (points.length >= 3) {
        L.polyline([points[points.length - 1], points[0]], {
          color: '#16a34a', weight: 1.5, dashArray: '4 6', opacity: 0.6,
        }).addTo(layerRef.current);
      }
    }
  }, [points]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const closePolygon = useCallback(() => {
    setPoints(prev => prev.length >= 3 ? [...prev, prev[0]] : prev);
  }, []);

  const undo = useCallback(() => {
    setPoints(prev => prev.slice(0, -1));
    onBoundaryChange?.(null);
  }, [onBoundaryChange]);

  const clear = useCallback(() => {
    setPoints([]);
    layerRef.current?.clearLayers();
    onBoundaryChange?.(null);
  }, [onBoundaryChange]);

  const toggleSat = useCallback(() => {
    const { osm, sat } = tileLayers.current;
    if (!mapRef.current || !osm) return;
    if (isSatellite) { mapRef.current.removeLayer(sat); osm.addTo(mapRef.current); }
    else             { mapRef.current.removeLayer(osm); sat.addTo(mapRef.current); }
    setIsSatellite(v => !v);
  }, [isSatellite]);

  const canClose  = points.length >= 3 && !isClosed;
  const hasPoints = points.length > 0;

  return (
    <div className="bmap-wrapper">
      {/* Map */}
      <div ref={containerRef} className="bmap-canvas" />

      {/* Top-left: satellite toggle */}
      {!readOnly && (
        <button className="bmap-sat-btn" onClick={toggleSat}>
          {isSatellite ? '🗺 Map' : '🛰 Sat'}
        </button>
      )}

      {/* Top-right: undo / clear */}
      {!readOnly && hasPoints && !isClosed && (
        <div className="bmap-top-right">
          {points.length > 1 && (
            <button className="bmap-ctrl-btn" onClick={undo}>↩ Undo</button>
          )}
          <button className="bmap-ctrl-btn danger" onClick={clear}>✕ Clear</button>
        </div>
      )}

      {/* Centre overlay: prominent FINISH button */}
      {!readOnly && canClose && (
        <div className="bmap-finish-wrap">
          <button className="bmap-finish-btn" onClick={closePolygon}>
            ✓ Close &amp; Finish Boundary
          </button>
        </div>
      )}

      {/* Bottom status bar */}
      {!readOnly && (
        <div className="bmap-status">
          {isClosed
            ? `Boundary closed — ${points.length - 1} points selected`
            : points.length === 0
            ? 'Click on the map to start drawing your land boundary'
            : points.length < 3
            ? `${points.length} point${points.length > 1 ? 's' : ''} — add at least ${3 - points.length} more`
            : `${points.length} points — click "Close & Finish" or keep adding points`}
        </div>
      )}

      {/* Clear button when closed */}
      {!readOnly && isClosed && (
        <button className="bmap-redraw-btn" onClick={clear}>Redraw</button>
      )}
    </div>
  );
}
