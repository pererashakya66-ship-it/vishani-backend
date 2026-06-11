const router = require('express').Router();

const API_BASE = process.env.API_BASE_URL ||
  `${process.env.HOST}/api`;

router.get('/:userId', (req, res) => {
  const { userId } = req.params;
  const latestUrl = `${API_BASE}/location/public/${userId}/latest`;
  const historyUrl = `${API_BASE}/location/public/${userId}/history?limit=60`;

  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Live Location – Women Safety App</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:sans-serif;background:#f5f5f5;display:flex;flex-direction:column;height:100vh}
    #header{background:#e91e8c;color:#fff;padding:10px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0}
    #header h1{font-size:15px;font-weight:700}
    #badge{font-size:11px;background:rgba(255,255,255,.22);padding:2px 10px;border-radius:12px;margin-left:auto;white-space:nowrap}
    #body{display:flex;flex:1;overflow:hidden}
    #map{flex:1;min-width:0}
    #sidebar{width:280px;background:#fff;border-left:1px solid #eee;display:flex;flex-direction:column;flex-shrink:0}
    #sidebar-header{padding:10px 14px;font-weight:700;font-size:13px;border-bottom:1px solid #eee;color:#333}
    #log{flex:1;overflow-y:auto;padding:0}
    .log-entry{padding:9px 14px;border-bottom:1px solid #f0f0f0;cursor:pointer}
    .log-entry:hover{background:#fef0f7}
    .log-entry.current{background:#fce4f3}
    .log-time{font-size:12px;font-weight:700;color:#e91e8c}
    .log-coords{font-size:11px;color:#666;margin-top:2px}
    .log-acc{font-size:10px;color:#aaa}
    #footer{padding:8px 14px;font-size:12px;color:#888;border-top:1px solid #eee;background:#fafafa;flex-shrink:0}
    @media(max-width:600px){
      #body{flex-direction:column}
      #sidebar{width:100%;height:200px;border-left:none;border-top:1px solid #eee}
    }
  </style>
</head>
<body>
  <div id="header">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
    </svg>
    <h1>Live Location Tracking</h1>
    <div id="badge">Connecting…</div>
  </div>

  <div id="body">
    <div id="map"></div>
    <div id="sidebar">
      <div id="sidebar-header">Location History</div>
      <div id="log"></div>
      <div id="footer">Updates every 30 s · <span id="count">0</span> points</div>
    </div>
  </div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const LATEST_URL  = '${latestUrl}';
    const HISTORY_URL = '${historyUrl}';

    const map = L.map('map').setView([6.9271, 79.8612], 15);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors', maxZoom: 19
    }).addTo(map);

    // Current position marker
    const pinIcon = L.divIcon({
      className: '',
      html: '<div style="width:16px;height:16px;background:#e91e8c;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.45)"></div>',
      iconAnchor: [8,8]
    });
    const histIcon = L.divIcon({
      className: '',
      html: '<div style="width:8px;height:8px;background:#e91e8c;opacity:.45;border-radius:50%"></div>',
      iconAnchor: [4,4]
    });

    let currentMarker = null;
    let accuracyCircle = null;
    let polyline = L.polyline([], { color:'#e91e8c', weight:3, opacity:0.6 }).addTo(map);
    let histMarkers = [];
    let firstFix = true;
    // track points we've already added: timestamp → true
    const seen = new Set();
    const points = []; // [{lat,lng,ts,acc}] oldest first

    // ── History (polyline + log) ────────────────────────────────────────────

    async function loadHistory() {
      try {
        const res = await fetch(HISTORY_URL);
        const { records } = await res.json();
        if (!records || !records.length) return;

        // Clear old history markers
        histMarkers.forEach(m => map.removeLayer(m));
        histMarkers = [];

        const latlngs = [];
        const logEl = document.getElementById('log');
        logEl.innerHTML = '';

        records.forEach((r, idx) => {
          const lat = r.latitude, lng = r.longitude;
          const ts  = new Date(r.createdAt);
          const key = r.createdAt;

          if (!seen.has(key)) {
            seen.add(key);
            points.push({ lat, lng, ts, acc: r.accuracy });
          }

          latlngs.push([lat, lng]);

          // History dot (skip last — that's the live marker)
          if (idx < records.length - 1) {
            const m = L.marker([lat, lng], { icon: histIcon })
              .bindTooltip(ts.toLocaleTimeString(), { direction:'top' });
            m.addTo(map);
            histMarkers.push(m);
          }

          // Log entry
          const entry = document.createElement('div');
          entry.className = 'log-entry' + (idx === records.length - 1 ? ' current' : '');
          entry.dataset.lat = lat;
          entry.dataset.lng = lng;
          entry.innerHTML =
            '<div class="log-time">' + ts.toLocaleTimeString() + '</div>' +
            '<div class="log-coords">' + lat.toFixed(6) + ', ' + lng.toFixed(6) + '</div>' +
            (r.accuracy ? '<div class="log-acc">±' + Math.round(r.accuracy) + ' m</div>' : '');
          entry.onclick = () => map.setView([lat, lng], 17);
          logEl.appendChild(entry);
        });

        polyline.setLatLngs(latlngs);
        document.getElementById('count').textContent = records.length;

        // Scroll log to bottom (most recent)
        logEl.scrollTop = logEl.scrollHeight;

        if (firstFix && latlngs.length) {
          map.setView(latlngs[latlngs.length - 1], 16);
          firstFix = false;
        }
      } catch (_) {}
    }

    // ── Latest point (live marker) ──────────────────────────────────────────

    async function fetchLatest() {
      try {
        const res = await fetch(LATEST_URL);
        if (!res.ok) throw new Error();
        const { record } = await res.json();
        if (!record) { document.getElementById('badge').textContent = 'No data yet'; return; }

        const lat = record.latitude, lng = record.longitude, acc = record.accuracy;

        if (!currentMarker) {
          currentMarker = L.marker([lat, lng], { icon: pinIcon, zIndexOffset: 1000 })
            .addTo(map).bindPopup('<b>Current position</b>');
        } else {
          currentMarker.setLatLng([lat, lng]);
        }

        if (acc) {
          if (!accuracyCircle)
            accuracyCircle = L.circle([lat, lng], { radius: acc, color:'#e91e8c', fillOpacity:0.08 }).addTo(map);
          else
            accuracyCircle.setLatLng([lat, lng]).setRadius(acc);
        }

        document.getElementById('badge').textContent = 'Live ● ' + new Date(record.createdAt).toLocaleTimeString();
      } catch {
        document.getElementById('badge').textContent = 'Offline';
      }
    }

    // ── Poll ────────────────────────────────────────────────────────────────

    async function tick() {
      await fetchLatest();
      await loadHistory();
    }

    tick();
    setInterval(tick, 30_000);   // match the 30-second upload interval
  </script>
</body>
</html>`);
});

module.exports = router;
