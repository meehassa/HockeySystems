// Screen templates. Each function returns an HTML string for #app.
// No system content is ever hardcoded here — everything comes through HS.data.
(function () {
  'use strict';

  var CATEGORY_EMOJI = {
    'forecheck': '🏒',              // 🏒
    'breakout': '🧊',               // 🧊
    'defensive-zone-coverage': '🛡️', // 🛡️
    'neutral-zone': '↔️',           // ↔️
    'power-play': '⚡',                   // ⚡
    'penalty-kill': '🧤',           // 🧤
    'faceoff': '⭕',                      // ⭕
    'regroup': '🔄'                 // 🔄
  };

  function categoryEmoji(cat) { return CATEGORY_EMOJI[cat] || '🏒'; }

  function esc(str) {
    var div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function header(title, backNav, right) {
    return '' +
      '<header class="app-header">' +
        (backNav ? '<button class="icon-btn" data-nav="' + backNav + '" aria-label="Back">←</button>' : '<span class="icon-btn-spacer"></span>') +
        '<h1>' + esc(title) + '</h1>' +
        (right || '<span class="icon-btn-spacer"></span>') +
      '</header>';
  }

  function masteryRing(pctVal) {
    var deg = Math.round((pctVal / 100) * 360);
    return '' +
      '<div class="mastery-ring" style="background: conic-gradient(var(--accent) ' + deg + 'deg, var(--ring-track) ' + deg + 'deg)">' +
        '<div class="mastery-ring-inner"><span class="mastery-pct">' + pctVal + '%</span><span class="mastery-label">known</span></div>' +
      '</div>';
  }

  // ---------- Profile select ----------
  function profileSelect() {
    var cards = HS.storage.PROFILE_NAMES.map(function (name) {
      var profile = HS.storage.loadProfile(name);
      var overall = HS.mastery.overallMastery(profile);
      return '' +
        '<button class="profile-card" data-nav="pick-profile" data-profile="' + esc(name) + '">' +
          '<span class="profile-avatar">' + esc(name[0]) + '</span>' +
          '<span class="profile-name">' + esc(name) + '</span>' +
          '<span class="profile-meta">' + esc(profile.tier) + ' · ' + overall.pct + '% known</span>' +
        '</button>';
    }).join('');

    var testName = HS.storage.TEST_PROFILE_NAME;
    var testProfile = HS.storage.loadProfile(testName);
    var testOverall = HS.mastery.overallMastery(testProfile);
    var testCard = '' +
      '<button class="profile-card profile-card-test" data-nav="pick-profile" data-profile="' + esc(testName) + '">' +
        '<span class="profile-avatar profile-avatar-test">🧪</span>' +
        '<span class="profile-name">Test Profile</span>' +
        '<span class="profile-meta">' + esc(testProfile.tier) + ' · ' + testOverall.pct + '% known · resettable</span>' +
      '</button>';

    return '' +
      '<div class="screen screen-profile-select">' +
        '<div class="brand"><span class="brand-emoji">🏒</span><h1>Hockey Systems</h1><p>Who’s playing?</p></div>' +
        '<div class="profile-cards">' + cards + '</div>' +
        '<p class="profile-select-divider">Just poking around?</p>' +
        '<div class="profile-cards">' + testCard + '</div>' +
      '</div>';
  }

  // ---------- Home ----------
  function home(ctx) {
    var profile = ctx.profile;
    var overall = HS.mastery.overallMastery(profile);
    var streak = profile.streak;

    return '' +
      '<div class="screen screen-home">' +
        header('Hey, ' + profile.name + '!', null,
          '<button class="icon-btn" data-nav="settings" aria-label="Settings">⚙️</button>') +
        '<div class="home-stats">' +
          '<div class="stat-pill">' +
            '<span class="stat-value">🔥 ' + streak.current + '</span>' +
            '<span class="stat-caption">day streak</span>' +
          '</div>' +
          '<div class="stat-pill">' +
            '<span class="stat-value">' + overall.pct + '%</span>' +
            '<span class="stat-caption">systems known</span>' +
          '</div>' +
        '</div>' +
        '<div class="home-actions">' +
          '<button class="big-btn big-btn-primary" data-nav="quiz-start">' +
            '<span class="big-btn-emoji">❓</span><span>Quiz Me</span>' +
          '</button>' +
          '<button class="big-btn" data-nav="library">' +
            '<span class="big-btn-emoji">📚</span><span>Browse Systems</span>' +
          '</button>' +
          '<button class="big-btn" data-nav="dashboard">' +
            '<span class="big-btn-emoji">📊</span><span>Where You Stand</span>' +
          '</button>' +
        '</div>' +
        '<button class="text-link" data-nav="profile-select">Switch profile</button>' +
      '</div>';
  }

  // ---------- Library ----------
  function library(ctx) {
    var profile = ctx.profile;
    var systems = HS.data.systemsByTier(profile.tier);
    var groups = HS.data.groupByCategory(systems);

    var body = groups.length === 0
      ? '<p class="empty-state">No systems yet for ' + esc(profile.tier) + '. Ask a grown-up to add some!</p>'
      : groups.map(function (g) {
          var cards = g.systems.map(function (s) {
            var m = HS.mastery.systemMastery(profile, s);
            return '' +
              '<button class="system-card" data-nav="system-detail" data-system-id="' + esc(s.id) + '">' +
                '<div class="system-card-main">' +
                  '<span class="system-card-name">' + esc(s.name) + '</span>' +
                  '<span class="system-card-summary">' + esc(s.summary.slice(0, 90)) + (s.summary.length > 90 ? '…' : '') + '</span>' +
                '</div>' +
                '<span class="system-card-pct">' + m.pct + '%</span>' +
              '</button>';
          }).join('');
          return '' +
            '<section class="category-group">' +
              '<h2 class="category-title">' + categoryEmoji(g.category) + ' ' + esc(g.label) + '</h2>' +
              '<div class="system-card-list">' + cards + '</div>' +
            '</section>';
        }).join('');

    return '' +
      '<div class="screen screen-library">' +
        header('Systems', 'home') +
        '<div class="scroll-area">' + body + '</div>' +
      '</div>';
  }

  // ---------- System detail ----------
  function systemDetail(ctx) {
    var system = HS.data.getSystemById(ctx.systemId);
    if (!system) return header('Not found', 'library') + '<p class="empty-state">System not found.</p>';
    var profile = ctx.profile;
    var m = HS.mastery.systemMastery(profile, system);
    var positions = system.positions || [];
    var selectedIndex = (typeof ctx.selectedRoleIndex === 'number') ? ctx.selectedRoleIndex : -1;
    var selected = positions[selectedIndex] || null;

    var roleChips = positions.map(function (p, i) {
      var active = i === selectedIndex;
      return '' +
        '<button class="role-chip' + (active ? ' role-chip-active' : '') + '" data-nav="select-role" data-role-index="' + i + '">' +
          '<span class="role-chip-num">' + (i + 1) + '</span>' +
          '<span class="role-chip-name">' + esc(p.role) + '</span>' +
        '</button>';
    }).join('');

    var jobCard = selected
      ? '<div class="job-card job-card-active"><span class="job-card-role">' + esc(selected.role) + '</span><p class="job-card-text">' + esc(selected.job) + '</p></div>'
      : '<div class="job-card job-card-hint">👆 Tap a number on the ice — or a position below — to see their job.</div>';

    var variants = (system.variants || []).length
      ? '<section class="detail-section"><h3>Variants</h3><ul class="variant-list">' +
          system.variants.map(function (v) {
            return '<li><strong>' + esc(v.label) + '.</strong> ' + esc(v.note) + '</li>';
          }).join('') +
        '</ul></section>'
      : '';

    return '' +
      '<div class="screen screen-detail">' +
        header(system.name, 'library') +
        '<div class="scroll-area">' +
          '<div class="detail-tags">' +
            '<span class="tag">' + categoryEmoji(system.category) + ' ' + esc(HS.data.categoryLabel(system.category)) + '</span>' +
            '<span class="tag">' + esc(system.tier) + '</span>' +
            '<span class="tag tag-pct">' + m.pct + '% known</span>' +
          '</div>' +
          '<p class="detail-summary">' + esc(system.summary) + '</p>' +
          '<section class="detail-section">' +
            '<h3>Tap the ice to see who does what</h3>' +
            HS.rink.renderRink(system.zone, positions, selectedIndex) +
            jobCard +
            '<div class="role-chip-row">' + roleChips + '</div>' +
          '</section>' +
          variants +
          '<button class="big-btn big-btn-primary" data-nav="quiz-start" data-system-id="' + esc(system.id) + '">' +
            '<span class="big-btn-emoji">❓</span><span>Quiz This System</span>' +
          '</button>' +
        '</div>' +
      '</div>';
  }

  // ---------- Quiz question ----------
  function quizQuestion(ctx) {
    var q = ctx.quiz;
    if (!q.questions.length) {
      return '' +
        '<div class="screen screen-quiz">' +
          header('Quiz', 'home') +
          '<p class="empty-state">No quiz questions available yet for this tier. Ask a grown-up to add more systems!</p>' +
        '</div>';
    }
    var current = q.questions[q.index];
    var question = current.question;
    var total = q.questions.length;
    var answered = q.answered;
    var selected = q.selectedOption;

    var options = question.options.map(function (opt, i) {
      var cls = 'option-btn';
      if (answered) {
        if (opt === question.answer) cls += ' option-correct';
        else if (i === selected) cls += ' option-wrong';
      }
      return '<button class="' + cls + '" data-nav="quiz-answer" data-option-index="' + i + '" ' + (answered ? 'disabled' : '') + '>' + esc(opt) + '</button>';
    }).join('');

    var feedback = '';
    if (answered) {
      var isCorrect = selected !== null && question.options[selected] === question.answer;
      feedback = '' +
        '<div class="quiz-feedback ' + (isCorrect ? 'quiz-feedback-correct' : 'quiz-feedback-wrong') + '">' +
          '<p class="quiz-feedback-headline">' + (isCorrect ? '✅ Nice! That’s it.' : '❌ Not quite.') + '</p>' +
          '<p class="quiz-feedback-why">' + esc(question.why) + '</p>' +
        '</div>' +
        '<button class="big-btn big-btn-primary" data-nav="quiz-next">' +
          '<span>' + (q.index + 1 < total ? 'Next Question' : 'See Results') + '</span>' +
        '</button>';
    }

    var flagBtn = q.flaggedCurrent
      ? '<button class="flag-btn flag-btn-done" disabled>🚩 Flagged — thanks!</button>'
      : '<button class="flag-btn" data-nav="quiz-flag">🚩 This looks wrong</button>';

    return '' +
      '<div class="screen screen-quiz">' +
        header('Question ' + (q.index + 1) + ' of ' + total, 'home') +
        '<div class="quiz-progress"><div class="quiz-progress-fill" style="width:' + Math.round(((q.index) / total) * 100) + '%"></div></div>' +
        '<div class="scroll-area">' +
          '<p class="quiz-system-tag">' + esc(current.systemName) + '</p>' +
          '<p class="quiz-prompt">' + esc(question.prompt) + '</p>' +
          '<div class="quiz-options">' + options + '</div>' +
          feedback +
          flagBtn +
        '</div>' +
      '</div>';
  }

  // ---------- Quiz results ----------
  function quizResults(ctx) {
    var q = ctx.quiz;
    var total = q.questions.length;
    var correct = q.answers.filter(function (a) { return a.correct; }).length;
    var pctVal = total ? Math.round((correct / total) * 100) : 0;
    var streak = ctx.profile.streak;

    var msg = pctVal === 100 ? 'Perfect! You’re a systems master.'
      : pctVal >= 70 ? 'Great job! Keep it up.'
      : pctVal >= 40 ? 'Nice work — review and try again.'
      : 'Good try — let’s go over these again.';

    return '' +
      '<div class="screen screen-results">' +
        header('Results', null) +
        '<div class="scroll-area results-body">' +
          '<p class="results-score">' + correct + ' / ' + total + '</p>' +
          '<p class="results-msg">' + esc(msg) + '</p>' +
          '<div class="stat-pill stat-pill-center"><span class="stat-value">🔥 ' + streak.current + '</span><span class="stat-caption">day streak</span></div>' +
          '<button class="big-btn big-btn-primary" data-nav="quiz-start" ' + (q.systemId ? 'data-system-id="' + esc(q.systemId) + '"' : '') + '>' +
            '<span>Quiz Again</span>' +
          '</button>' +
          '<button class="big-btn" data-nav="home"><span>Back to Home</span></button>' +
        '</div>' +
      '</div>';
  }

  // ---------- Dashboard ----------
  function dashboard(ctx) {
    var profile = ctx.profile;
    var overall = HS.mastery.overallMastery(profile);
    var systems = HS.data.systemsByTier(profile.tier);
    var groups = HS.data.groupByCategory(systems);
    var weakest = HS.mastery.weakestSystems(profile, 3);

    var bars = groups.map(function (g) {
      var rows = g.systems.map(function (s) {
        var m = HS.mastery.systemMastery(profile, s);
        return '' +
          '<div class="mastery-row">' +
            '<span class="mastery-row-name">' + esc(s.name) + '</span>' +
            '<div class="mastery-bar"><div class="mastery-bar-fill" style="width:' + m.pct + '%"></div></div>' +
            '<span class="mastery-row-pct">' + m.pct + '%</span>' +
          '</div>';
      }).join('');
      return '<section class="category-group"><h2 class="category-title">' + categoryEmoji(g.category) + ' ' + esc(g.label) + '</h2>' + rows + '</section>';
    }).join('');

    var weakList = weakest.length
      ? '<ul class="weak-list">' + weakest.map(function (row) {
          var pctCls = row.mastery.pct >= 70 ? 'weak-pct-good' : row.mastery.pct >= 40 ? 'weak-pct-mid' : 'weak-pct-low';
          return '' +
            '<li>' +
              '<button class="weak-item" data-nav="system-detail" data-system-id="' + esc(row.system.id) + '">' +
                '<span>' + esc(row.system.name) + '</span>' +
                '<span class="weak-pct ' + pctCls + '">' + row.mastery.pct + '%</span>' +
              '</button>' +
            '</li>';
        }).join('') + '</ul>'
      : '<p class="empty-state">Nothing to review yet — take a quiz first!</p>';

    return '' +
      '<div class="screen screen-dashboard">' +
        header('Where You Stand', 'home') +
        '<div class="scroll-area">' +
          masteryRing(overall.pct) +
          '<div class="home-stats">' +
            '<div class="stat-pill"><span class="stat-value">🔥 ' + profile.streak.current + '</span><span class="stat-caption">current streak</span></div>' +
            '<div class="stat-pill"><span class="stat-value">🏆 ' + profile.streak.longest + '</span><span class="stat-caption">longest streak</span></div>' +
          '</div>' +
          '<section class="detail-section"><h3>Weakest systems to review</h3>' + weakList + '</section>' +
          '<section class="detail-section"><h3>Mastery by system</h3>' + bars + '</section>' +
        '</div>' +
      '</div>';
  }

  // ---------- Settings (tier + flagged questions for review) ----------
  function settings(ctx) {
    var profile = ctx.profile;
    var allFlags = [];
    HS.storage.PROFILE_NAMES.forEach(function (name) {
      var p = name === profile.name ? profile : HS.storage.loadProfile(name);
      (p.flags || []).forEach(function (f) {
        allFlags.push(Object.assign({ profileName: name }, f));
      });
    });
    allFlags.sort(function (a, b) { return new Date(b.flaggedAt) - new Date(a.flaggedAt); });

    var flagList = allFlags.length
      ? '<ul class="flag-list">' + allFlags.map(function (f) {
          return '' +
            '<li class="flag-item">' +
              '<span class="flag-item-system">' + esc(f.profileName) + ' · ' + esc(f.systemName) + '</span>' +
              '<span class="flag-item-prompt">' + esc(f.prompt) + '</span>' +
            '</li>';
        }).join('') + '</ul>'
      : '<p class="empty-state">No flagged questions.</p>';

    var isTest = profile.name === HS.storage.TEST_PROFILE_NAME;
    var testSection = isTest
      ? '<section class="detail-section">' +
          '<h3>Test profile</h3>' +
          '<p class="muted">This profile is just for trying things out — it never counts toward Ollie’s or Eva’s progress.</p>' +
          '<button class="big-btn" data-nav="reset-test-profile"><span>🗑️ Reset Test Data</span></button>' +
        '</section>'
      : '';

    return '' +
      '<div class="screen screen-settings">' +
        header('Settings', 'home') +
        '<div class="scroll-area">' +
          '<section class="detail-section">' +
            '<h3>' + esc(profile.name) + '’s tier</h3>' +
            '<div class="tier-toggle">' +
              '<button class="tier-btn' + (profile.tier === 'peewee' ? ' tier-btn-active' : '') + '" data-nav="tier-set" data-tier="peewee">Peewee (12U)</button>' +
              '<button class="tier-btn' + (profile.tier === 'bantam' ? ' tier-btn-active' : '') + '" data-nav="tier-set" data-tier="bantam">Bantam (14U)</button>' +
            '</div>' +
          '</section>' +
          testSection +
          '<section class="detail-section">' +
            '<h3>Flagged questions <span class="muted">(Ollie &amp; Eva, for grown-up review)</span></h3>' +
            flagList +
          '</section>' +
        '</div>' +
      '</div>';
  }

  window.HS = window.HS || {};
  window.HS.screens = {
    profileSelect: profileSelect,
    home: home,
    library: library,
    systemDetail: systemDetail,
    quizQuestion: quizQuestion,
    quizResults: quizResults,
    dashboard: dashboard,
    settings: settings
  };
})();
