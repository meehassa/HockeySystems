// Mastery %, streaks-adjacent scoring helpers.
// Rule (from systems-seed.json _readme): score ONLY verified:true questions,
// ONLY within the profile's own tier. verified:false never touches scoring.
(function () {
  'use strict';

  function pct(correct, total) {
    if (total === 0) return 0;
    return Math.round((correct / total) * 100);
  }

  // { correct, total, pct } for one system, based on each question's most recent answer.
  function systemMastery(profile, system) {
    var items = HS.data.verifiedQuestionsForSystem(system.id);
    var correct = 0;
    items.forEach(function (item) {
      var p = profile.progress[item.question.id];
      if (p && p.correct) correct++;
    });
    return { correct: correct, total: items.length, pct: pct(correct, items.length) };
  }

  // Overall mastery across every verified question in the profile's tier.
  function overallMastery(profile) {
    var items = HS.data.verifiedQuestionsForTier(profile.tier);
    var correct = 0;
    items.forEach(function (item) {
      var p = profile.progress[item.question.id];
      if (p && p.correct) correct++;
    });
    return { correct: correct, total: items.length, pct: pct(correct, items.length) };
  }

  // Lowest-mastery systems in-tier (unattempted counts as 0%). Skips systems with no verified questions.
  function weakestSystems(profile, n) {
    var systems = HS.data.systemsByTier(profile.tier);
    var scored = systems
      .map(function (s) { return { system: s, mastery: systemMastery(profile, s) }; })
      .filter(function (row) { return row.mastery.total > 0; });
    scored.sort(function (a, b) { return a.mastery.pct - b.mastery.pct; });
    return scored.slice(0, n || 3);
  }

  window.HS = window.HS || {};
  window.HS.mastery = {
    systemMastery: systemMastery,
    overallMastery: overallMastery,
    weakestSystems: weakestSystems
  };
})();
