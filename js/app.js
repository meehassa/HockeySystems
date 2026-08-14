// Router + event delegation + service worker registration.
(function () {
  'use strict';

  var QUIZ_SESSION_LENGTH = 5;

  var state = {
    screen: 'loading',
    profile: null,
    params: {},
    quiz: null
  };

  var appEl = document.getElementById('app');
  var animatorController = null;

  function render() {
    var ctx = { profile: state.profile, quiz: state.quiz };
    Object.assign(ctx, state.params);

    switch (state.screen) {
      case 'profile-select': appEl.innerHTML = HS.screens.profileSelect(); break;
      case 'home': appEl.innerHTML = HS.screens.home(ctx); break;
      case 'library': appEl.innerHTML = HS.screens.library(ctx); break;
      case 'system-detail': appEl.innerHTML = HS.screens.systemDetail(ctx); break;
      case 'quiz-question': appEl.innerHTML = HS.screens.quizQuestion(ctx); break;
      case 'quiz-results': appEl.innerHTML = HS.screens.quizResults(ctx); break;
      case 'dashboard': appEl.innerHTML = HS.screens.dashboard(ctx); break;
      case 'settings': appEl.innerHTML = HS.screens.settings(ctx); break;
      default: appEl.innerHTML = '<div class="screen"><p class="empty-state">Loading…</p></div>';
    }
    window.scrollTo(0, 0);
    mountAnimator();
  }

  // The replay player writes directly to the SVG DOM every animation frame,
  // independent of render(). Any full re-render destroys and recreates that
  // SVG, so the old controller (and its in-flight rAF loop) must be torn
  // down and a fresh one wired up whenever system-detail is on screen.
  function mountAnimator() {
    if (animatorController) { animatorController.destroy(); animatorController = null; }
    if (state.screen !== 'system-detail') return;

    var system = HS.data.getSystemById(state.params.systemId);
    if (!system || !system.animation) return;

    var svgEl = appEl.querySelector('.rink');
    var controlsEl = appEl.querySelector('.anim-controls');
    var captionEl = appEl.querySelector('.anim-caption');
    if (!svgEl || !controlsEl || !captionEl) return;

    var playBtn = controlsEl.querySelector('.anim-btn-play');
    var replayBtn = controlsEl.querySelector('.anim-btn-replay');
    var stepDots = Array.prototype.slice.call(controlsEl.querySelectorAll('.anim-step-dot'));

    function updateCaption(beatIndex) {
      captionEl.textContent = system.animation.beats[beatIndex].caption;
      stepDots.forEach(function (dot, i) { dot.classList.toggle('anim-step-dot-active', i === beatIndex); });
    }
    function updatePlayIcon(isPlaying) {
      playBtn.textContent = isPlaying ? '⏸' : '▶';
      playBtn.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
    }

    animatorController = HS.animator.create({
      svgEl: svgEl,
      actors: system.animation.actors,
      beats: system.animation.beats,
      onBeatChange: updateCaption,
      onPlayStateChange: updatePlayIcon
    });

    playBtn.addEventListener('click', function () {
      if (animatorController.isPlaying()) animatorController.pause();
      else animatorController.play();
    });
    replayBtn.addEventListener('click', function () { animatorController.reset(); });
    stepDots.forEach(function (dot, i) {
      dot.addEventListener('click', function () { animatorController.seek(i); });
    });
  }

  function go(screen, params) {
    state.screen = screen;
    state.params = params || {};
    render();
  }

  function pickProfile(name) {
    state.profile = HS.storage.loadProfile(name);
    HS.storage.setActiveProfileName(name);
    go('home');
  }

  function startQuiz(systemId) {
    var pool = systemId
      ? HS.data.verifiedQuestionsForSystem(systemId)
      : HS.data.verifiedQuestionsForTier(state.profile.tier);

    var picked = HS.data.shuffle(pool).slice(0, QUIZ_SESSION_LENGTH);

    state.quiz = {
      systemId: systemId || null,
      questions: picked,
      index: 0,
      answers: [],
      answered: false,
      selectedOption: null,
      flaggedCurrent: false
    };
    go('quiz-question');
  }

  function answerQuiz(optionIndex) {
    var q = state.quiz;
    if (!q || q.answered) return;
    var current = q.questions[q.index];
    var question = current.question;
    var correct = question.options[optionIndex] === question.answer;

    q.answered = true;
    q.selectedOption = optionIndex;
    q.answers.push({ questionId: question.id, correct: correct });

    HS.storage.recordAnswer(state.profile, question, current.systemId, correct);
    render();
  }

  function flagCurrentQuestion() {
    var q = state.quiz;
    if (!q || q.flaggedCurrent) return;
    var current = q.questions[q.index];
    var system = HS.data.getSystemById(current.systemId);
    HS.storage.recordFlag(state.profile, current.question, system);
    q.flaggedCurrent = true;
    render();
  }

  function nextQuizQuestion() {
    var q = state.quiz;
    if (!q) return;
    if (q.index + 1 < q.questions.length) {
      q.index += 1;
      q.answered = false;
      q.selectedOption = null;
      q.flaggedCurrent = false;
      render();
    } else {
      HS.storage.markStudyDayComplete(state.profile);
      go('quiz-results');
    }
  }

  function setTier(tier) {
    HS.storage.setTier(state.profile, tier);
    render();
  }

  function resetTestProfile() {
    state.profile = HS.storage.resetProfile(HS.storage.TEST_PROFILE_NAME);
    render();
  }

  function selectRole(index) {
    state.params.selectedRoleIndex = index;
    render();
  }

  function selectActor(actorId) {
    var system = HS.data.getSystemById(state.params.systemId);
    if (!system || !system.animation) return;
    var actor = system.animation.actors.find(function (a) { return a.id === actorId; });
    if (!actor || !actor.positionRole) return;
    var idx = (system.positions || []).findIndex(function (p) { return p.role === actor.positionRole; });
    if (idx === -1) return;
    selectRole(idx);
  }

  // ---------- Central click handling ----------
  appEl.addEventListener('click', function (e) {
    var el = e.target.closest('[data-nav]');
    if (!el) return;
    var nav = el.dataset.nav;

    switch (nav) {
      case 'pick-profile': pickProfile(el.dataset.profile); break;
      case 'profile-select': go('profile-select'); break;
      case 'home': go('home'); break;
      case 'library': go('library'); break;
      case 'system-detail': go('system-detail', { systemId: el.dataset.systemId }); break;
      case 'dashboard': go('dashboard'); break;
      case 'settings': go('settings'); break;
      case 'quiz-start': startQuiz(el.dataset.systemId || null); break;
      case 'quiz-answer': answerQuiz(Number(el.dataset.optionIndex)); break;
      case 'quiz-next': nextQuizQuestion(); break;
      case 'quiz-flag': flagCurrentQuestion(); break;
      case 'tier-set': setTier(el.dataset.tier); break;
      case 'reset-test-profile': resetTestProfile(); break;
      case 'select-role': selectRole(Number(el.dataset.roleIndex)); break;
      case 'select-actor': selectActor(el.dataset.actorId); break;
      case 'back': history.length > 1 ? history.back() : go('home'); break;
      default: break;
    }
  });

  // ---------- Boot ----------
  function boot() {
    HS.data.load().then(function () {
      var lastProfile = HS.storage.getActiveProfileName();
      var knownNames = HS.storage.PROFILE_NAMES.concat([HS.storage.TEST_PROFILE_NAME]);
      if (lastProfile && knownNames.indexOf(lastProfile) !== -1) {
        pickProfile(lastProfile);
      } else {
        go('profile-select');
      }
    }).catch(function (err) {
      appEl.innerHTML = '<div class="screen"><p class="empty-state">Couldn’t load systems data.<br>' + err.message + '</p></div>';
    });
  }

  boot();

  // ---------- Service worker (offline support) ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('service-worker.js').catch(function () {
        // offline-on-first-load or unsupported host; app still works online
      });
    });
  }
})();
