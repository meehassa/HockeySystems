// Tweens puck/player dots between an animation's beats by writing directly to
// the SVG DOM (JS-driven requestAnimationFrame loop, not CSS transitions) so
// playback survives independent of the app's render() cycle. No dependency
// on any particular system — just walks whatever actors/beats it's given.
(function () {
  'use strict';

  var BEAT_MS = 900;
  var SEEK_MS = 450;

  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function create(config) {
    var actors = config.actors || [];
    var beats = config.beats || [];
    var onBeatChange = config.onBeatChange || function () {};
    var onPlayStateChange = config.onPlayStateChange || function () {};

    var els = {};
    actors.forEach(function (a) {
      els[a.id] = config.svgEl.querySelector('#actor-' + a.id);
    });

    var beatIndex = 0;
    var isPlaying = false;
    var rafId = null;

    function setPositions(positions) {
      actors.forEach(function (a) {
        var p = positions[a.id];
        var el = els[a.id];
        if (!p || !el) return;
        el.setAttribute('transform', 'translate(' + p[0] + ',' + p[1] + ')');
      });
    }

    function cancelTween() {
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    }

    function tweenTo(targetIndex, duration, done) {
      cancelTween();
      var fromPositions = beats[beatIndex].positions;
      var toPositions = beats[targetIndex].positions;
      var start = null;

      function frame(ts) {
        if (start === null) start = ts;
        var t = Math.min(1, (ts - start) / duration);
        var e = easeInOutQuad(t);
        actors.forEach(function (a) {
          var from = fromPositions[a.id] || toPositions[a.id];
          var to = toPositions[a.id] || from;
          var el = els[a.id];
          if (!from || !to || !el) return;
          var x = lerp(from[0], to[0], e);
          var y = lerp(from[1], to[1], e);
          el.setAttribute('transform', 'translate(' + x.toFixed(2) + ',' + y.toFixed(2) + ')');
        });
        if (t < 1) {
          rafId = requestAnimationFrame(frame);
        } else {
          rafId = null;
          beatIndex = targetIndex;
          done && done();
        }
      }
      rafId = requestAnimationFrame(frame);
    }

    function advance() {
      if (beatIndex + 1 >= beats.length) {
        isPlaying = false;
        onPlayStateChange(false);
        return;
      }
      tweenTo(beatIndex + 1, BEAT_MS, function () {
        onBeatChange(beatIndex);
        if (isPlaying) advance();
      });
    }

    function play() {
      if (beatIndex >= beats.length - 1) reset();
      isPlaying = true;
      onPlayStateChange(true);
      advance();
    }

    function pause() {
      if (!isPlaying) return;
      isPlaying = false;
      onPlayStateChange(false);
      // let the in-flight step land cleanly rather than freezing mid-tween
      cancelTween();
      setPositions(beats[beatIndex].positions);
    }

    function reset() {
      cancelTween();
      isPlaying = false;
      beatIndex = 0;
      setPositions(beats[0].positions);
      onBeatChange(0);
      onPlayStateChange(false);
    }

    function seek(targetIndex) {
      if (targetIndex === beatIndex || targetIndex < 0 || targetIndex >= beats.length) return;
      isPlaying = false;
      onPlayStateChange(false);
      tweenTo(targetIndex, SEEK_MS, function () { onBeatChange(beatIndex); });
    }

    function destroy() { cancelTween(); }

    return {
      play: play,
      pause: pause,
      reset: reset,
      seek: seek,
      destroy: destroy,
      isPlaying: function () { return isPlaying; },
      currentBeat: function () { return beatIndex; }
    };
  }

  window.HS = window.HS || {};
  window.HS.animator = { create: create, BEAT_MS: BEAT_MS };
})();
