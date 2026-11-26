/* ══════════════════════════════════════════════════════════════
   snowball.js — ❄️ 눈싸움 미니게임
     · 움직이는 친구 눈사람을 맞히면 점수 (연속으로 맞히면 보너스)
     · 60초 동안 최대한 많이 맞히기
   ══════════════════════════════════════════════════════════════ */
window.SNOWBALL = (function () {
  var cv, ctx, W = 0, H = 0, dpr = 1;
  var running = false, raf = null, last = 0;
  var state = null;
  var opts = { cfg: { hat: 'santa', scarf: 'red', face: 'smile' }, targets: [], onScore: null };
  var imgs = {};
  var aim = { x: 0, y: 0, has: false };
  var bound = false;

  function img(key, cfg) {
    if (!imgs[key]) {
      var im = new Image();
      im.src = SNOWMAN.dataUri(cfg);
      imgs[key] = im;
    }
    return imgs[key];
  }

  function playerImg() {
    var cfg = SNOWMAN.sanitize(opts.cfg);
    return img('p|' + cfg.hat + cfg.scarf + cfg.face, cfg);
  }

  function resize() {
    var r = cv.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(320, r.width);
    H = Math.max(240, r.height);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (state) {
      state.groundY = H - 40;
      state.player.x = W / 2;
    }
  }

  function makeTargets() {
    var list = opts.targets && opts.targets.length ? opts.targets : [
      { name: '지우', hat: 'santa', scarf: 'red', face: 'smile' },
      { name: '서연', hat: 'beanie', scarf: 'blue', face: 'surprise' },
      { name: '하준', hat: 'crown', scarf: 'green', face: 'cool' },
      { name: '수아', hat: 'ribbon', scarf: 'yellow', face: 'smile' },
      { name: '도윤', hat: 'beanie', scarf: 'red', face: 'sleep' }
    ];
    return list.slice(0, 8);
  }

  function spawn(t, fromSide) {
    var far = Math.random() < 0.45;
    var sz = far ? 84 + Math.random() * 26 : 104 + Math.random() * 34;
    t.h = sz;
    t.w = sz * (240 / 288);
    t.baseY = H * (far ? 0.545 : 0.625);
    t.y = t.baseY - sz;
    t.x = fromSide === 1 ? -t.w : (fromSide === -1 ? W + t.w : Math.random() * (W - t.w));
    t.vx = (Math.random() < 0.5 ? -1 : 1) * (48 + Math.random() * 95);
    t.bob = Math.random() * 6.28;
    t.bobAmp = 2 + Math.random() * 4;
    t.far = far;
    t.dead = 0;
    t.hit = false;
  }

  function newGame() {
    state = {
      t: 0, left: 60, endAt: Date.now() + 60000, score: 0, hits: 0, thrown: 0, streak: 0, best: 0,
      balls: [], parts: [], targets: [], snow: [], groundY: H - 40,
      player: { x: W / 2, y: 0, flip: 0 }, cool: 0, shake: 0, over: false
    };
    for (var i = 0; i < 46; i++) {
      state.snow.push({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 2.2, v: 14 + Math.random() * 38 });
    }
    var src = makeTargets();
    for (var k = 0; k < 5; k++) {
      var t = Object.assign({}, src[k % src.length]);
      t.cfg = SNOWMAN.sanitize(t);
      t.img = img('t|' + t.cfg.hat + t.cfg.scarf + t.cfg.face, t.cfg);
      spawn(t, 0);
      state.targets.push(t);
    }
  }

  function throwBall() {
    if (!state || state.over || state.cool > 0) return;
    var p = state.player;
    var ax = aim.has ? aim.x : W / 2;
    var ay = aim.has ? aim.y : H * 0.25;
    var ox = p.x + (ax > p.x ? 26 : -26), oy = p.y - 88;
    var dx = ax - ox, dy = ay - oy;
    var len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    var sp = 1080;
    state.balls.push({ x: ox, y: oy, vx: dx / len * sp, vy: dy / len * sp - 80, r: 9, life: 2.2 });
    state.cool = 0.24;
    state.thrown++;
    SOUND.sfx('throw');
  }

  function burst(x, y, n) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 190;
      state.parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, r: 2 + Math.random() * 4, life: .6 + Math.random() * .5 });
    }
  }

  function update(dt) {
    var s = state;
    s.t += dt;
    s.cool = Math.max(0, s.cool - dt);
    s.shake = Math.max(0, s.shake - dt * 3);
    if (!s.over) {
      s.left = Math.max(0, (s.endAt - Date.now()) / 1000);
      if (s.left <= 0) { s.left = 0; endGame(); return; }
      /* 점수는 0.5초마다 화면에 반영 */
      if (s.t - (s._lastPaint || 0) > 0.25) { s._lastPaint = s.t; paintHud(); }
    }

    /* 눈덩이 */
    for (var i = s.balls.length - 1; i >= 0; i--) {
      var b = s.balls[i];
      b.vy += 620 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      var gone = b.life <= 0 || b.x < -40 || b.x > W + 40 || b.y > H + 40;

      for (var j = 0; j < s.targets.length && !gone; j++) {
        var t = s.targets[j];
        if (t.hit) continue;
        var cx = t.x + t.w / 2, cy = t.y + t.h * 0.5;
        if (Math.abs(b.x - cx) < t.w * 0.52 && Math.abs(b.y - cy) < t.h * 0.55) {
          hitTarget(t, b.x, b.y);
          gone = true;
        }
      }
      if (gone) s.balls.splice(i, 1);
    }

    /* 표적 */
    for (var k = 0; k < s.targets.length; k++) {
      var tg = s.targets[k];
      if (tg.hit) {
        tg.dead -= dt;
        if (tg.dead <= 0) {
          var src = makeTargets();
          var nt = Object.assign({}, src[Math.floor(Math.random() * src.length)]);
          nt.cfg = SNOWMAN.sanitize(nt);
          nt.img = img('t|' + nt.cfg.hat + nt.cfg.scarf + nt.cfg.face, nt.cfg);
          spawn(nt, Math.random() < 0.5 ? 1 : -1);
          s.targets[k] = nt;
        }
        continue;
      }
      tg.x += tg.vx * dt;
      tg.bob += dt * 2.4;
      tg.y = tg.baseY - tg.h + Math.sin(tg.bob) * tg.bobAmp;
      if (tg.x < 6 && tg.vx < 0) { tg.x = 6; tg.vx *= -1; }
      if (tg.x + tg.w > W - 6 && tg.vx > 0) { tg.x = W - 6 - tg.w; tg.vx *= -1; }
    }

    /* 조각·눈 */
    for (var p = s.parts.length - 1; p >= 0; p--) {
      var q = s.parts[p];
      q.vy += 900 * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.life -= dt;
      if (q.life <= 0) s.parts.splice(p, 1);
    }
    s.snow.forEach(function (f) {
      f.y += f.v * dt;
      f.x += Math.sin(f.y / 40) * 11 * dt;
      if (f.y > H) { f.y = -4; f.x = Math.random() * W; }
    });
  }

  function hitTarget(t, bx, by) {
    t.hit = true;
    t.dead = 0.32;
    var s = state;
    s.hits++;
    s.streak++;
    s.best = Math.max(s.best, s.streak);
    var gain = 10 + Math.min(20, (s.streak - 1) * 3);
    s.score += gain;
    s.shake = 0.5;
    burst(bx, by, 16);
    burst(t.x + t.w / 2, t.y + t.h / 2, 10);
    SOUND.sfx('hit');
    paintHud();
  }

  function paintHud() {
    if (!state) return;
    var el1 = document.getElementById('sbScore');
    var el2 = document.getElementById('sbHits');
    var el3 = document.getElementById('sbTime');
    if (el1) el1.textContent = SNOW.fmtNum(state.score);
    if (el2) el2.textContent = String(state.hits);
    if (el3) el3.textContent = String(Math.ceil(state.left));
  }

  function draw() {
    var s = state;
    if (!s) return;
    var g = ctx;
    g.save();
    if (s.shake > 0) g.translate((Math.random() - .5) * 6 * s.shake, (Math.random() - .5) * 6 * s.shake);

    /* 하늘 */
    var sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0b1b45');
    sky.addColorStop(.55, '#1c3468');
    sky.addColorStop(1, '#2b4c8a');
    g.fillStyle = sky;
    g.fillRect(-10, -10, W + 20, H + 20);

    /* 별 */
    g.fillStyle = 'rgba(255,255,255,.75)';
    for (var i = 0; i < 40; i++) {
      var sx = (i * 137.5) % W, sy = (i * 71.3) % (H * 0.55);
      var r = (i % 3 === 0) ? 1.6 : 1;
      g.globalAlpha = 0.35 + ((i * 7) % 10) / 18;
      g.beginPath(); g.arc(sx, sy, r, 0, 6.283); g.fill();
    }
    g.globalAlpha = 1;

    /* 달 */
    g.fillStyle = 'rgba(255, 244, 200, .9)';
    g.beginPath(); g.arc(W - 86, 78, 26, 0, 6.283); g.fill();
    g.fillStyle = 'rgba(255, 244, 200, .16)';
    g.beginPath(); g.arc(W - 86, 78, 46, 0, 6.283); g.fill();

    /* 먼 마을 실루엣 */
    for (var t2 = 0; t2 < 7; t2++) {
      var tx = (t2 * 197 + 40) % W;
      var th = 70 + ((t2 * 53) % 50);
      drawTree(g, tx, H * 0.60, th);
    }

    /* 친구들이 서 있는 눈둑 */
    var bankY = H * 0.585;
    var bg2 = g.createLinearGradient(0, bankY - 40, 0, bankY + 90);
    bg2.addColorStop(0, '#e9f4ff');
    bg2.addColorStop(1, '#c3d9f2');
    g.fillStyle = bg2;
    g.beginPath();
    g.moveTo(-20, bankY + 70);
    g.bezierCurveTo(W * .25, bankY - 46, W * .7, bankY - 20, W + 20, bankY + 20);
    g.lineTo(W + 20, H); g.lineTo(-20, H); g.closePath(); g.fill();

    /* 눈밭 */
    var gr = g.createLinearGradient(0, s.groundY - 60, 0, H);
    gr.addColorStop(0, '#eaf4ff');
    gr.addColorStop(1, '#bcd6f0');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(0, s.groundY + 10);
    g.bezierCurveTo(W * .3, s.groundY - 22, W * .7, s.groundY + 18, W, s.groundY - 6);
    g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();

    /* 표적들 */
    s.targets.slice().sort(function (a, b) { return a.baseY - b.baseY; }).forEach(function (tg) {
      if (!tg.img || !tg.img.complete) return;
      g.save();
      if (tg.hit) {
        g.globalAlpha = Math.max(0, tg.dead / 0.32);
        g.translate(tg.x + tg.w / 2, tg.y + tg.h / 2);
        g.scale(1 + (0.32 - tg.dead) * 2.2, 1 + (0.32 - tg.dead) * 2.2);
        g.translate(-(tg.x + tg.w / 2), -(tg.y + tg.h / 2));
      }
      g.drawImage(tg.img, tg.x, tg.y, tg.w, tg.h);
      g.restore();
      if (!tg.hit) tag(g, tg.name, tg.x + tg.w / 2, tg.y - 4);
    });

    /* 눈덩이 */
    s.balls.forEach(function (b) {
      g.save();
      g.shadowColor = 'rgba(255,255,255,.9)';
      g.shadowBlur = 10;
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(b.x, b.y, b.r, 0, 6.283); g.fill();
      g.restore();
    });

    /* 조각 */
    s.parts.forEach(function (p) {
      g.globalAlpha = Math.max(0, Math.min(1, p.life * 1.6));
      g.fillStyle = '#ffffff';
      g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill();
    });
    g.globalAlpha = 1;

    /* 내 눈사람 */
    var pim = playerImg();
    var ph = Math.min(172, H * 0.34), pw = ph * (240 / 288);
    var px = s.player.x - pw / 2, py = s.groundY + 14 - ph;
    if (pim.complete) g.drawImage(pim, px, py, pw, ph);
    tag(g, '나', s.player.x, py - 4);

    /* 조준선 */
    if (aim.has && !s.over) {
      var ax = aim.x, ay = aim.y;
      g.strokeStyle = 'rgba(255,255,255,.55)';
      g.lineWidth = 1.6;
      g.setLineDash([5, 6]);
      g.beginPath(); g.moveTo(s.player.x, s.player.y - 88); g.lineTo(ax, ay); g.stroke();
      g.setLineDash([]);
      g.strokeStyle = '#ffd166';
      g.beginPath(); g.arc(ax, ay, 13, 0, 6.283); g.stroke();
      g.beginPath(); g.moveTo(ax - 19, ay); g.lineTo(ax - 6, ay);
      g.moveTo(ax + 6, ay); g.lineTo(ax + 19, ay);
      g.moveTo(ax, ay - 19); g.lineTo(ax, ay - 6);
      g.moveTo(ax, ay + 6); g.lineTo(ax, ay + 19);
      g.stroke();
    }

    /* 눈 */
    g.fillStyle = 'rgba(255,255,255,.85)';
    s.snow.forEach(function (f) {
      g.beginPath(); g.arc(f.x, f.y, f.r, 0, 6.283); g.fill();
    });

    /* 남은 시간 바 */
    g.fillStyle = 'rgba(255,255,255,.18)';
    g.fillRect(0, 0, W, 5);
    g.fillStyle = '#7fd0ff';
    g.fillRect(0, 0, W * Math.max(0, s.left / 60), 5);

    g.restore();
  }

  function drawTree(g, x, y, h) {
    g.fillStyle = 'rgba(20, 46, 88, .55)';
    g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + h * 0.34, y); g.lineTo(x - h * 0.34, y); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(x, y - h * 0.72); g.lineTo(x + h * 0.42, y - h * 0.1); g.lineTo(x - h * 0.42, y - h * 0.1); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.5)';
    g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + h * 0.14, y - h * 0.66); g.lineTo(x - h * 0.14, y - h * 0.66); g.closePath(); g.fill();
  }

  function tag(g, text, cx, cy) {
    if (!text) return;
    g.save();
    g.font = '700 11px Pretendard, "Malgun Gothic", sans-serif';
    var w = g.measureText(text).width + 15;
    var h = 20, x = cx - w / 2, y = cy - h;
    g.fillStyle = 'rgba(255,255,255,.95)';
    roundRect(g, x, y, w, h, 11);
    g.fill();
    g.beginPath();
    g.moveTo(cx - 5, y + h); g.lineTo(cx + 5, y + h); g.lineTo(cx, y + h + 5); g.closePath();
    g.fillStyle = 'rgba(255,255,255,.95)';
    g.fill();
    g.fillStyle = '#2b3a63';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, cx, y + h / 2 + 0.5);
    g.restore();
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function loop(ts) {
    if (!running) return;
    if (!last) last = ts;
    var dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    update(dt);
    draw();
    raf = requestAnimationFrame(loop);
  }

  function start() {
    resize();
    newGame();
    paintHud();
    var startEl = document.getElementById('sbStart');
    var resEl = document.getElementById('sbResult');
    if (startEl) startEl.classList.add('hidden');
    if (resEl) resEl.classList.add('hidden');
    aim.has = false;
    running = true;
    last = 0;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
    SOUND.sfx('pop');
  }

  function endGame() {
    if (!state || state.over) return;
    state.over = true;
    running = false;
    cancelAnimationFrame(raf);
    SOUND.sfx('win');
    var f = document.getElementById('sbFinal');
    var l = document.getElementById('sbLine');
    if (f) f.textContent = SNOW.fmtNum(state.score);
    if (l) l.textContent = '눈덩이 ' + state.hits + '개를 맞혔어요 · 최고 연속 ' + state.best + '번!';
    var resEl = document.getElementById('sbResult');
    if (resEl) resEl.classList.remove('hidden');
    if (opts.onScore) opts.onScore(state.score, state.hits);
  }

  function bind() {
    if (bound) return;
    bound = true;
    cv.addEventListener('pointermove', function (e) {
      var r = cv.getBoundingClientRect();
      aim.x = e.clientX - r.left;
      aim.y = e.clientY - r.top;
      aim.has = true;
    });
    cv.addEventListener('pointerdown', function (e) {
      var r = cv.getBoundingClientRect();
      aim.x = e.clientX - r.left;
      aim.y = e.clientY - r.top;
      aim.has = true;
      throwBall();
    });
    document.addEventListener('keydown', function (e) {
      if (!running) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (!aim.has) { aim.x = W / 2; aim.y = H * 0.22; aim.has = true; }
        throwBall();
      }
    });
    window.addEventListener('resize', function () { if (running) resize(); });
  }

  function open(o) {
    opts = Object.assign(opts, o || {});
    cv = document.getElementById('sbCanvas');
    ctx = cv.getContext('2d');
    bind();
    resize();
    /* 시작 화면 미리보기 */
    state = null;
    if (running) { running = false; cancelAnimationFrame(raf); }
    var startEl = document.getElementById('sbStart');
    var resEl = document.getElementById('sbResult');
    if (startEl) startEl.classList.remove('hidden');
    if (resEl) resEl.classList.add('hidden');
    drawIdle();
  }

  function close() {
    running = false;
    cancelAnimationFrame(raf);
    state = null;
    var startEl = document.getElementById('sbStart');
    var resEl = document.getElementById('sbResult');
    if (startEl) startEl.classList.remove('hidden');
    if (resEl) resEl.classList.add('hidden');
  }

  function drawIdle() {
    if (!state) {
      var g = ctx;
      var sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#0b1b45'); sky.addColorStop(1, '#2b4c8a');
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,.85)';
      for (var i = 0; i < 40; i++) {
        g.globalAlpha = 0.3 + ((i * 7) % 10) / 18;
        g.beginPath(); g.arc((i * 137.5) % W, (i * 71.3) % (H * 0.6), 1.3, 0, 6.283); g.fill();
      }
      g.globalAlpha = 1;
    }
  }

  return { open: open, start: start, close: close, endGame: endGame, isRunning: function () { return running; } };
})();
