// Simple generic rink diagram. Two render modes:
//  - renderRink: static, numbered tap-to-explore markers (used when a system
//    has no `animation` data yet — always-available fallback).
//  - renderAnimatedRink: labeled puck + per-player dots at their beat-0
//    position, driven by HS.animator for the "Watch It Happen" replay.
// Neither knows about individual systems — both just walk whatever
// positions/actors they're given.
(function () {
  'use strict';

  var ZONE_LABELS = { defensive: 'Defensive Zone', neutral: 'Neutral Zone', offensive: 'Offensive Zone' };
  var ZONE_CENTER_X = { defensive: 34, neutral: 100, offensive: 166 };

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Real rink markings (faceoff circles/dots, creases, nets) so the diagram
  // reads as an actual rink rather than three flat colored blocks.
  function rinkMarkings() {
    return '' +
      '<circle cx="30" cy="20" r="7" class="rink-faceoff-circle"/><circle cx="30" cy="20" r="1.4" class="rink-faceoff-dot"/>' +
      '<circle cx="30" cy="80" r="7" class="rink-faceoff-circle"/><circle cx="30" cy="80" r="1.4" class="rink-faceoff-dot"/>' +
      '<circle cx="170" cy="20" r="7" class="rink-faceoff-circle"/><circle cx="170" cy="20" r="1.4" class="rink-faceoff-dot"/>' +
      '<circle cx="170" cy="80" r="7" class="rink-faceoff-circle"/><circle cx="170" cy="80" r="1.4" class="rink-faceoff-dot"/>' +
      '<circle cx="100" cy="25" r="1.4" class="rink-faceoff-dot"/>' +
      '<circle cx="100" cy="75" r="1.4" class="rink-faceoff-dot"/>' +
      '<path d="M 12 42 Q 22 50 12 58 Z" class="rink-crease"/>' +
      '<path d="M 188 42 Q 178 50 188 58 Z" class="rink-crease"/>' +
      '<rect x="8.5" y="46" width="3.5" height="8" class="rink-net"/>' +
      '<rect x="188" y="46" width="3.5" height="8" class="rink-net"/>';
  }

  function baseIce(zone) {
    var highlight = ZONE_LABELS[zone] ? zone : 'neutral';
    function zoneOpacity(z) { return z === highlight ? '0.4' : '0.12'; }
    return {
      highlight: highlight,
      svg: '' +
        '<rect x="2" y="2" width="196" height="96" rx="26" ry="26" class="rink-ice"/>' +
        '<rect x="2" y="2" width="65" height="96" rx="26" ry="26" class="rink-zone rink-zone-defensive" style="opacity:' + zoneOpacity('defensive') + '"/>' +
        '<rect x="67" y="2" width="66" height="96" class="rink-zone rink-zone-neutral" style="opacity:' + zoneOpacity('neutral') + '"/>' +
        '<rect x="133" y="2" width="65" height="96" rx="26" ry="26" class="rink-zone rink-zone-offensive" style="opacity:' + zoneOpacity('offensive') + '"/>' +
        rinkMarkings() +
        '<line x1="67" y1="2" x2="67" y2="98" class="rink-blueline"/>' +
        '<line x1="133" y1="2" x2="133" y2="98" class="rink-blueline"/>' +
        '<line x1="100" y1="2" x2="100" y2="98" class="rink-centerline"/>' +
        '<circle cx="100" cy="50" r="9" class="rink-centercircle"/>' +
        '<line x1="12" y1="2" x2="12" y2="98" class="rink-goalline"/>' +
        '<line x1="188" y1="2" x2="188" y2="98" class="rink-goalline"/>'
    };
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
    var idx = (typeof selectedIndex === 'number') ? selectedIndex : -1;
    var ice = baseIce(zone);
    return '' +
      '<svg viewBox="0 0 200 100" class="rink" role="img" aria-label="' + (ZONE_LABELS[ice.highlight] || 'Rink') + ' highlighted">' +
        ice.svg +
        renderMarkers(ice.highlight, positions, idx) +
        '<rect x="2" y="2" width="196" height="96" rx="26" ry="26" class="rink-border"/>' +
      '</svg>';
  }

  // actors: [{id, label, positionRole}], beats: [{caption, positions:{id:[x,y]}}]
  function renderAnimatedRink(zone, animation, selectedActorId) {
    var ice = baseIce(zone);
    var actors = (animation && animation.actors) || [];
    var initial = (animation && animation.beats && animation.beats[0] && animation.beats[0].positions) || {};
    var selectedIds = selectedActorId || [];

    // Puck always paints last (on top) so a player standing right next to it
    // — which happens constantly, since that's how possession is shown —
    // never covers it.
    var paintOrder = actors.slice().sort(function (a, b) {
      return (a.id === 'puck' ? 1 : 0) - (b.id === 'puck' ? 1 : 0);
    });

    var actorEls = paintOrder.map(function (a) {
      var pos = initial[a.id] || [100, 50];
      var isPuck = a.id === 'puck';
      var isSel = selectedIds.indexOf(a.id) !== -1;
      var cls = 'rink-actor ' + (isPuck ? 'rink-actor-puck' : 'rink-actor-player') + (isSel ? ' rink-actor-selected' : '');
      var nav = isPuck ? '' : (' data-nav="select-actor" data-actor-id="' + esc(a.id) + '" role="button" aria-label="' + esc(a.label) + '"');
      var glow = isSel ? '<circle r="14" class="rink-marker-glow"/>' : '';
      var body = isPuck
        ? '<circle r="7.5" class="rink-puck-halo"/><circle r="5.5" class="rink-puck-dot"/>'
        : '<circle r="10" class="rink-marker-dot' + (isSel ? ' rink-marker-dot-active' : '') + '"/>' +
          '<text class="rink-marker-num" dy="3">' + esc(a.label) + '</text>';
      return '<g id="actor-' + esc(a.id) + '" class="' + cls + '" transform="translate(' + pos[0] + ',' + pos[1] + ')"' + nav + '>' +
        glow + body + '</g>';
    }).join('');

    return '' +
      '<svg viewBox="0 0 200 100" class="rink" role="img" aria-label="' + (ZONE_LABELS[ice.highlight] || 'Rink') + ' with players">' +
        ice.svg +
        actorEls +
        '<rect x="2" y="2" width="196" height="96" rx="26" ry="26" class="rink-border"/>' +
      '</svg>';
  }

  window.HS = window.HS || {};
  window.HS.rink = { renderRink: renderRink, renderAnimatedRink: renderAnimatedRink, ZONE_LABELS: ZONE_LABELS };
})();
