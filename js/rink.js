// Simple generic rink diagram: outline + the three zones, with the system's
// zone (from its `zone` field in the JSON) highlighted, plus tappable numbered
// markers for each position — generic index-based placement, never per-system
// custom art, so it never needs to know about individual systems.
(function () {
  'use strict';

  var ZONE_LABELS = { defensive: 'Defensive Zone', neutral: 'Neutral Zone', offensive: 'Offensive Zone' };
  var ZONE_CENTER_X = { defensive: 34, neutral: 100, offensive: 166 };

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderMarkers(zone, positions, selectedIndex) {
    if (!positions || !positions.length) return '';
    var cx = ZONE_CENTER_X[zone] || ZONE_CENTER_X.neutral;
    var n = positions.length;
    return positions.map(function (p, i) {
      var y = n === 1 ? 50 : 18 + (64 * i / (n - 1));
      var isSel = i === selectedIndex;
      var r = isSel ? 11 : 8;
      var glow = isSel ? '<circle cx="' + cx + '" cy="' + y + '" r="11" class="rink-marker-glow"/>' : '';
      return '' +
        '<g class="rink-marker" data-nav="select-role" data-role-index="' + i + '" role="button" aria-label="' + esc(p.role) + '">' +
          glow +
          '<circle cx="' + cx + '" cy="' + y + '" r="' + r + '" class="rink-marker-dot' + (isSel ? ' rink-marker-dot-active' : '') + '"/>' +
          '<text x="' + cx + '" y="' + (y + 3) + '" class="rink-marker-num">' + (i + 1) + '</text>' +
        '</g>';
    }).join('');
  }

  function renderRink(zone, positions, selectedIndex) {
    var highlight = ZONE_LABELS[zone] ? zone : 'neutral';
    function zoneOpacity(z) { return z === highlight ? '0.85' : '0.18'; }
    var idx = (typeof selectedIndex === 'number') ? selectedIndex : -1;

    return '' +
      '<svg viewBox="0 0 200 100" class="rink" role="img" aria-label="' + (ZONE_LABELS[highlight] || 'Rink') + ' highlighted">' +
        '<rect x="2" y="2" width="196" height="96" rx="26" ry="26" class="rink-ice"/>' +
        '<rect x="2" y="2" width="65" height="96" rx="26" ry="26" class="rink-zone rink-zone-defensive" style="opacity:' + zoneOpacity('defensive') + '"/>' +
        '<rect x="67" y="2" width="66" height="96" class="rink-zone rink-zone-neutral" style="opacity:' + zoneOpacity('neutral') + '"/>' +
        '<rect x="133" y="2" width="65" height="96" rx="26" ry="26" class="rink-zone rink-zone-offensive" style="opacity:' + zoneOpacity('offensive') + '"/>' +
        '<line x1="67" y1="2" x2="67" y2="98" class="rink-blueline"/>' +
        '<line x1="133" y1="2" x2="133" y2="98" class="rink-blueline"/>' +
        '<line x1="100" y1="2" x2="100" y2="98" class="rink-centerline"/>' +
        '<circle cx="100" cy="50" r="9" class="rink-centercircle"/>' +
        '<line x1="12" y1="2" x2="12" y2="98" class="rink-goalline"/>' +
        '<line x1="188" y1="2" x2="188" y2="98" class="rink-goalline"/>' +
        renderMarkers(highlight, positions, idx) +
        '<rect x="2" y="2" width="196" height="96" rx="26" ry="26" class="rink-border"/>' +
      '</svg>';
  }

  window.HS = window.HS || {};
  window.HS.rink = { renderRink: renderRink, ZONE_LABELS: ZONE_LABELS };
})();
