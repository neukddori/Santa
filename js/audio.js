/* ══════════════════════════════════════════════════════════════
   audio.js — Web Audio 오르골 캐롤 3곡 + 효과음
   외부 MP3 없이 브라우저에서 직접 연주합니다. (수업 중 링크 끊김 없음)
     · 징글벨 / 위 위시 유 어 메리 크리스마스 / 고요한 밤
   ══════════════════════════════════════════════════════════════ */
window.SOUND = (function () {
  var ctx = null, master = null, bgmGain = null, sfxGain = null;
  var enabled = false, timer = null, songIdx = 0, nextTime = 0, step = 0, beatPos = 0;
  var current = null, gestureBound = false;

  var NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  function freq(n) {
    var m = /^([A-G]#?)(-?\d)$/.exec(n);
    if (!m) return 440;
    var midi = (parseInt(m[2], 10) + 1) * 12 + NOTE[m[1]];
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /* ── 곡 데이터: [음, 박자] ─────────────────────────────── */
  var SONGS = [
    {
      name: '징글벨',
      bpm: 132,
      notes: (
        'E4:1 E4:1 E4:2 E4:1 E4:1 E4:2 E4:1 G4:1 C4:1.5 D4:0.5 E4:4 ' +
        'F4:1 F4:1 F4:1.5 F4:0.5 F4:1 E4:1 E4:1 E4:0.5 E4:0.5 E4:1 D4:1 D4:1 E4:1 D4:2 G4:2 ' +
        'E4:1 E4:1 E4:2 E4:1 E4:1 E4:2 E4:1 G4:1 C4:1.5 D4:0.5 E4:4 ' +
        'F4:1 F4:1 F4:1.5 F4:0.5 F4:1 E4:1 E4:1 E4:0.5 E4:0.5 G4:1 G4:1 F4:1 D4:1 C4:4 R:2'
      ),
      chords: 'C:8 G:8 C:8 F:8 C:8 G:8 C:8 C:8 C:8 G:8 C:8 F:8 C:8 G:8 C:8 C:8'
    },
    {
      name: '위 위시 유 어 메리 크리스마스',
      bpm: 116,
      notes: (
        'D4:1 G4:1 G4:1 A4:1 G4:1 F#4:1 E4:2 ' +
        'E4:1 A4:1 A4:1 B4:1 A4:1 G4:1 F#4:2 ' +
        'D4:1 G4:1 G4:1 A4:1 G4:1 F#4:1 E4:2 ' +
        'D4:1 A4:1 A4:1 B4:1 A4:1 G4:1 F#4:2 ' +
        'D4:1 G4:1 G4:1 A4:1 G4:1 F#4:1 E4:2 ' +
        'D4:1 A4:1 A4:1 B4:1 A4:1 G4:1 F#4:2 ' +
        'E4:2 C4:1 E4:1 D4:2 C4:2 ' +
        'B4:1 A4:1 G4:1 A4:1 G4:2 F#4:2 D4:2 R:2'
      ),
      chords: 'G:8 D:8 G:8 D:8 G:8 D:8 C:8 G:8'
    },
    {
      name: '고요한 밤',
      bpm: 76,
      notes: (
        'G4:2 A4:1 G4:2 E4:1 G4:2 A4:1 G4:2 E4:1 ' +
        'D5:2 D5:1 B4:3 C5:2 C5:1 G4:3 ' +
        'A4:2 A4:1 C5:2 B4:1 A4:2 G4:1 E4:2 E4:1 ' +
        'A4:2 A4:1 C5:2 B4:1 A4:2 G4:1 E4:2 E4:1 ' +
        'D5:2 D5:1 F5:2 D5:1 B4:2 C5:1 E5:3 ' +
        'C5:2 G4:1 E4:2 G4:1 F4:2 D4:1 C4:6 R:3'
      ),
      chords: 'G:12 C:12 G:12 G:12 D:12 C:12'
    }
  ];

  function parse(str) {
    return str.trim().split(/\s+/).map(function (tok) {
      var p = tok.split(':');
      return { note: p[0], beat: parseFloat(p[1] || '1') };
    });
  }

  function ensure() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);

    bgmGain = ctx.createGain();
    bgmGain.gain.value = 0.0;
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 6200; lp.Q.value = 0.5;
    bgmGain.connect(lp); lp.connect(master);

    /* 은은한 잔향 (짧은 지연 되먹임) */
    var dly = ctx.createDelay(1.0);
    dly.delayTime.value = 0.24;
    var fb = ctx.createGain(); fb.gain.value = 0.22;
    var wet = ctx.createGain(); wet.gain.value = 0.18;
    lp.connect(dly); dly.connect(fb); fb.connect(dly); dly.connect(wet); wet.connect(master);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.5;
    sfxGain.connect(master);
    return ctx;
  }

  function resume() {
    ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  /* 오르골 한 음 */
  function bell(f, t, dur, vol) {
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.35, dur));

    var o1 = ctx.createOscillator();
    o1.type = 'triangle'; o1.frequency.value = f;
    var o2 = ctx.createOscillator();
    o2.type = 'sine'; o2.frequency.value = f * 2.002;
    var g2 = ctx.createGain(); g2.gain.value = 0.3;
    var o3 = ctx.createOscillator();
    o3.type = 'sine'; o3.frequency.value = f * 3.01;
    var g3 = ctx.createGain(); g3.gain.value = 0.08;

    o1.connect(g); o2.connect(g2); g2.connect(g); o3.connect(g3); g3.connect(g);
    g.connect(bgmGain);
    o1.start(t); o2.start(t); o3.start(t);
    o1.stop(t + Math.max(0.5, dur) + 0.2);
    o2.stop(t + Math.max(0.5, dur) + 0.2);
    o3.stop(t + Math.max(0.5, dur) + 0.2);
  }

  function pad(f, t, dur, vol) {
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.35);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    var o = ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = f;
    var o2 = ctx.createOscillator();
    o2.type = 'triangle'; o2.frequency.value = f * 1.005;
    var g2 = ctx.createGain(); g2.gain.value = 0.4;
    o.connect(g); o2.connect(g2); g2.connect(g);
    g.connect(bgmGain);
    o.start(t); o2.start(t);
    o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
  }

  function chord(root, t, dur) {
    var map = { C: [261.63, 329.63, 392.0], F: [174.61, 220.0, 261.63], G: [196.0, 246.94, 293.66], D: [146.83, 185.0, 220.0], A: [220.0, 277.18, 329.63], E: [164.81, 207.65, 246.94] };
    var f = map[root] || map.C;
    for (var i = 0; i < f.length; i++) pad(f[i], t, dur, 0.035);
  }

  /* ── 스케줄러 ───────────────────────────────────────────── */
  function scheduler() {
    if (!ctx) return;
    var song = current;
    if (!song) return;
    var beat = 60 / song.bpm;
    var guard = 0;
    while (nextTime < ctx.currentTime + 2.2 && guard++ < 200) {
      var n = song.parsed[step];
      var dur = n.beat * beat;
      if (n.note !== 'R') bell(freq(n.note), nextTime, Math.max(0.28, dur * 0.92), 0.16);
      /* 4박마다 반주 화음 */
      var bar = Math.floor(beatPos / 4 + 0.001);
      if (Math.abs(beatPos % 4) < 0.001 && song.chordAt[bar]) {
        chord(song.chordAt[bar], nextTime, beat * 4 * 0.96);
      }
      nextTime += dur;
      beatPos += n.beat;
      step += 1;
      if (step >= song.parsed.length) {
        step = 0; beatPos = 0;
        songIdx = (songIdx + 1) % SONGS.length;
        loadSong();
        return;
      }
    }
  }

  function loadSong() {
    var s = SONGS[songIdx];
    var chordAt = [];
    s.chords.trim().split(/\s+/).forEach(function (tok) {
      var p = tok.split(':');
      var beats = parseFloat(p[1] || '4');
      for (var k = 0; k < beats / 4; k++) chordAt.push(p[0]);
    });
    current = Object.assign({}, s, { parsed: parse(s.notes), chordAt: chordAt });
    step = 0;
    beatPos = 0;
  }

  function startBgm() {
    if (!ensure()) return false;
    resume();
    if (!current) loadSong();
    enabled = true;
    nextTime = ctx.currentTime + 0.12;
    bgmGain.gain.cancelScheduledValues(ctx.currentTime);
    bgmGain.gain.setTargetAtTime(0.5, ctx.currentTime, 0.4);
    if (!timer) timer = setInterval(scheduler, 220);
    return true;
  }

  function stopBgm() {
    enabled = false;
    if (bgmGain && ctx) bgmGain.gain.setTargetAtTime(0.0, ctx.currentTime, 0.25);
    if (timer) { clearInterval(timer); timer = null; }
  }

  function toggle(force) {
    var want = typeof force === 'boolean' ? force : !enabled;
    if (want) { if (!startBgm()) return false; } else stopBgm();
    return enabled;
  }

  /* ── 효과음 ─────────────────────────────────────────────── */
  function tone(f1, f2, dur, type, vol, when) {
    if (!ensure()) return;
    resume();
    var t = ctx.currentTime + (when || 0);
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type || 'triangle';
    o.frequency.setValueAtTime(f1, t);
    if (f2 && f2 !== f1) o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfxGain);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function noise(dur, vol) {
    if (!ensure()) return;
    resume();
    var t = ctx.currentTime;
    var len = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.8;
    var g = ctx.createGain(); g.gain.value = vol || 0.22;
    src.connect(bp); bp.connect(g); g.connect(sfxGain);
    src.start(t);
  }

  function sfx(name) {
    switch (name) {
      case 'click': tone(660, 880, 0.09, 'triangle', 0.12); break;
      case 'pop': tone(420, 760, 0.12, 'sine', 0.16); break;
      case 'throw': noise(0.16, 0.12); tone(300, 120, 0.14, 'sine', 0.08); break;
      case 'hit': noise(0.22, 0.3); tone(880, 320, 0.18, 'triangle', 0.16); break;
      case 'miss': tone(300, 180, 0.18, 'sine', 0.1); break;
      case 'jump': tone(420, 780, 0.16, 'triangle', 0.14); break;
      case 'gift': tone(880, 1320, 0.12, 'sine', 0.16); tone(1320, 1760, 0.16, 'sine', 0.12, 0.08); break;
      case 'hurt': tone(240, 120, 0.28, 'sawtooth', 0.14); break;
      case 'correct': tone(740, 740, 0.1, 'sine', 0.14); tone(988, 988, 0.16, 'sine', 0.14, 0.09); break;
      case 'wrong': tone(300, 240, 0.2, 'sine', 0.12); break;
      case 'type': tone(1200, 1200, 0.05, 'sine', 0.07); break;
      case 'win': [0, 0.12, 0.24, 0.4].forEach(function (w, i) { tone([659, 784, 988, 1319][i], [659, 784, 988, 1319][i], 0.22, 'triangle', 0.15, w); }); break;
      case 'arrive': tone(988, 988, 0.1, 'sine', 0.1); tone(1319, 1319, 0.22, 'sine', 0.09, 0.1); break;
      default: break;
    }
  }

  /* 첫 손짓에서 오디오 잠금 해제 */
  function bindGesture(autoStart) {
    if (gestureBound) return;
    gestureBound = true;
    var go = function () {
      resume();
      if (autoStart && enabled) startBgm();
    };
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
      document.addEventListener(ev, go, { once: true, passive: true });
    });
  }

  function init(opts) {
    opts = opts || {};
    bindGesture(!!opts.autostart);
    return true;
  }

  return {
    init: init,
    toggle: toggle,
    isOn: function () { return enabled; },
    songName: function () { return SONGS[songIdx] ? SONGS[songIdx].name : '징글벨'; },
    songList: function () { return SONGS.map(function (s) { return s.name; }); },
    sfx: sfx,
    resume: resume
  };
})();
