// Local persistence: profiles, progress, streaks, flags. localStorage only — no backend.
(function () {
  'use strict';

  var PROFILE_NAMES = ['Ollie', 'Eva'];
  var ACTIVE_KEY = 'hs:activeProfile';
  var DEFAULT_TIER = 'peewee';

  function profileKey(name) {
    return 'hs:profile:' + name;
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function daysBetween(isoA, isoB) {
    var a = new Date(isoA + 'T00:00:00');
    var b = new Date(isoB + 'T00:00:00');
    return Math.round((b - a) / 86400000);
  }

  function defaultProfile(name) {
    return {
      name: name,
      tier: DEFAULT_TIER,
      progress: {},   // questionId -> { correct, attempts, lastAt, systemId }
      streak: { current: 0, longest: 0, lastStudyDate: null },
      flags: []        // { id, questionId, systemId, systemName, prompt, flaggedAt }
    };
  }

  function loadProfile(name) {
    var raw = localStorage.getItem(profileKey(name));
    if (!raw) return defaultProfile(name);
    try {
      var parsed = JSON.parse(raw);
      // fill in any fields missing from older saves
      var base = defaultProfile(name);
      return Object.assign(base, parsed, {
        progress: parsed.progress || {},
        streak: Object.assign(base.streak, parsed.streak || {}),
        flags: parsed.flags || []
      });
    } catch (e) {
      return defaultProfile(name);
    }
  }

  function saveProfile(profile) {
    localStorage.setItem(profileKey(profile.name), JSON.stringify(profile));
  }

  function getActiveProfileName() {
    return localStorage.getItem(ACTIVE_KEY);
  }

  function setActiveProfileName(name) {
    localStorage.setItem(ACTIVE_KEY, name);
  }

  function setTier(profile, tier) {
    profile.tier = tier;
    saveProfile(profile);
  }

  function recordAnswer(profile, question, systemId, correct) {
    profile.progress[question.id] = {
      correct: correct,
      attempts: ((profile.progress[question.id] || {}).attempts || 0) + 1,
      lastAt: new Date().toISOString(),
      systemId: systemId
    };
    saveProfile(profile);
  }

  function recordFlag(profile, question, system) {
    profile.flags.push({
      id: 'flag-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      questionId: question.id,
      systemId: system.id,
      systemName: system.name,
      prompt: question.prompt,
      flaggedAt: new Date().toISOString()
    });
    saveProfile(profile);
  }

  // Call once when a quiz session is completed (>=1 question answered).
  // A "day" counts the first time this fires on a given calendar date.
  function markStudyDayComplete(profile) {
    var today = todayISO();
    var s = profile.streak;
    if (s.lastStudyDate === today) {
      saveProfile(profile);
      return s; // already counted today
    }
    if (s.lastStudyDate && daysBetween(s.lastStudyDate, today) === 1) {
      s.current = s.current + 1;
    } else {
      s.current = 1; // first ever session, or streak broken
    }
    s.longest = Math.max(s.longest, s.current);
    s.lastStudyDate = today;
    saveProfile(profile);
    return s;
  }

  window.HS = window.HS || {};
  window.HS.storage = {
    PROFILE_NAMES: PROFILE_NAMES,
    loadProfile: loadProfile,
    saveProfile: saveProfile,
    getActiveProfileName: getActiveProfileName,
    setActiveProfileName: setActiveProfileName,
    setTier: setTier,
    recordAnswer: recordAnswer,
    recordFlag: recordFlag,
    markStudyDayComplete: markStudyDayComplete
  };
})();
