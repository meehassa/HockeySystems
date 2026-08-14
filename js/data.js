// Loads systems-seed.json and provides query helpers.
// Systems content NEVER gets hardcoded elsewhere — everything reads from the JSON.
(function () {
  'use strict';

  var CATEGORY_LABELS = {
    'forecheck': 'Forecheck',
    'breakout': 'Breakout',
    'defensive-zone-coverage': 'D-Zone Coverage',
    'neutral-zone': 'Neutral Zone',
    'power-play': 'Power Play',
    'penalty-kill': 'Penalty Kill',
    'faceoff': 'Faceoff Plays',
    'regroup': 'Regroups'
  };

  function categoryLabel(category) {
    if (CATEGORY_LABELS[category]) return CATEGORY_LABELS[category];
    return category.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  var _cache = null; // { systems: [...] }

  function load() {
    if (_cache) return Promise.resolve(_cache);
    return fetch('systems-seed.json')
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load systems-seed.json: ' + res.status);
        return res.json();
      })
      .then(function (json) {
        _cache = json;
        return _cache;
      });
  }

  function allSystems() {
    return (_cache && _cache.systems) || [];
  }

  function systemsByTier(tier) {
    return allSystems().filter(function (s) { return s.tier === tier; });
  }

  function groupByCategory(systems) {
    var groups = {};
    var order = [];
    systems.forEach(function (s) {
      if (!groups[s.category]) {
        groups[s.category] = [];
        order.push(s.category);
      }
      groups[s.category].push(s);
    });
    return order.map(function (cat) {
      return { category: cat, label: categoryLabel(cat), systems: groups[cat] };
    });
  }

  function getSystemById(id) {
    return allSystems().find(function (s) { return s.id === id; }) || null;
  }

  // Flattened verified:true questions for a tier, each tagged with its system.
  function verifiedQuestionsForTier(tier) {
    var out = [];
    systemsByTier(tier).forEach(function (system) {
      (system.questions || []).forEach(function (q) {
        if (q.verified === true) {
          out.push({ question: q, systemId: system.id, systemName: system.name });
        }
      });
    });
    return out;
  }

  function verifiedQuestionsForSystem(systemId) {
    var system = getSystemById(systemId);
    if (!system) return [];
    return (system.questions || [])
      .filter(function (q) { return q.verified === true; })
      .map(function (q) { return { question: q, systemId: system.id, systemName: system.name }; });
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  window.HS = window.HS || {};
  window.HS.data = {
    load: load,
    allSystems: allSystems,
    systemsByTier: systemsByTier,
    groupByCategory: groupByCategory,
    getSystemById: getSystemById,
    verifiedQuestionsForTier: verifiedQuestionsForTier,
    verifiedQuestionsForSystem: verifiedQuestionsForSystem,
    categoryLabel: categoryLabel,
    shuffle: shuffle
  };
})();
