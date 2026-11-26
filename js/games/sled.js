/* ══════════════════════════════════════════════════════════════
   sled.js — 🛷 썰매 타기 미니게임
     · 눈 언덕을 내려가며 눈덩이·나무를 점프로 피하고 선물 상자를 먹기
     · 하트 3개, 멀리 갈수록 빨라집니다
   ══════════════════════════════════════════════════════════════ */
window.SLED = (function () {
  var cv, ctx, W = 0, H = 0, dpr = 1;
  var running = false, raf = null, last = 0;
  var s = null;
  var opts = { cfg: { hat: 'santa', scarf: 'red', face: 'smile' }, onScore: null };
  var imgCache = {}, bound = false;

  function playerImg() {
    var c = SNOWMAN.sanitize(opts.cfg);
    var k = 'p' + c.hat + c.scarf + c.face;
    if (!imgCache[k]) { var im = new Image(); im.src = SNOWMAN.dataUri(c); imgCache[k] = im; }
    return imgCache[k];
  }

  function resize() {
    var r = cv.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(320, r.width);
    H = Math.max(240, r.height);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (s) { s.groundY = Math.round(H * 0.76); s.player.x = Math.round(W * 0.24); }
  }

  function newGame() {
    s = {
      t: 0, dist: 0, gifts: 0, lives: 3, score: 0, speed: 320,
      groundY: Math.round(H * 0.76),
      player: { x: Math.round(W * 0.24), y: 0, vy: 0, onGround: true, inv: 0, tilt: 0 },
      obs: [], giftsArr: [], parts: [], flakes: [], nextObs: 1.1, nextGift: 1.6,
      over: false, shake: 0
    };
    for (var i = 0; i < 60; i++) {
      s.flakes.push({ x: Math.random() * W, y: Math.random() * H, r: .8 + Math.random() * 2, v: 30 + Math.random() * 60, d: Math.random() * 6.28 });
    }
  }

  function jump() {
    if (!s || s.over) return;
    if (s.player.onGround) {
      s.player.vy = -760;
      s.player.onGround = false;
      SOUND.sfx('jump');
    }
  }

  function spawnObs() {
    var isTree = Math.random() < 0.35;
    var w = isTree ? 46 : 40 + Math.random() * 12;
    var h = isTree ? 108 + Math.random() * 34 : 34 + Math.random() * 12;
    s.obs.push({ type: isTree ? 'tree' : 'snow', x: W + 60, w: w, h: h, spin: Math.random() * 6.28 });
  }

  function spawnGift() {
    var low = Math.random() < 0.42;
    var h = 42;
    s.giftsArr.push({
      x: W + 40,
      y: s.groundY - (low ? h + 12 : h + 70 + Math.random() * 90),
      w: h, h: h, bob: Math.random() * 6.28, got: false
    });
  }

  function update(dt) {
    if (!s || s.over) return;
    s.t += dt;
    s.dist += s.speed * dt;
    s.speed = Math.min(860, 320 + s.t * 12);
    s.shake = Math.max(0, s.shake - dt * 3);
    s.player.inv = Math.max(0, s.player.inv - dt);

    /* 점프 */
    var p = s.player;
    p.vy += 2100 * dt;
    p.y += p.vy * dt;
    if (p.y >= 0) { p.y = 0; p.vy = 0; p.onGround = true; }
    p.tilt = p.onGround ? Math.sin(s.t * 14) * 0.02 : Math.max(-0.16, Math.min(0.16, p.vy / 4200));

    /* 장애물·선물 이동 */
    s.nextObs -= dt;
    if (s.nextObs <= 0) { spawnObs(); s.nextObs = Math.max(0.55, 1.35 - s.t * 0.02) * (0.8 + Math.random() * 0.7); }
    s.nextGift -= dt;
    if (s.nextGift <= 0) { spawnGift(); s.nextGift = 1.25 + Math.random() * 1.2; }

    var pw = 94, ph = 116;
    var px = p.x - pw / 2, py = s.groundY - ph + p.y;

    for (var i = s.obs.length - 1; i >= 0; i--) {
      var o = s.obs[i];
      o.x -= s.speed * dt;
      if (o.x + o.w < -20) { s.obs.splice(i, 1); continue; }
      if (p.inv <= 0) {
        var ox = o.x, oy = s.groundY - o.h;
        if (px + pw * 0.78 > ox && px + pw * 0.22 < ox + o.w && py + ph * 0.86 > oy) {
          hurt(o);
        }
      }
    }

    for (var k = s.giftsArr.length - 1; k >= 0; k--) {
      var g = s.giftsArr[k];
      g.x -= s.speed * dt;
      g.bob += dt * 3;
      if (g.x + g.w < -20) { s.giftsArr.splice(k, 1); continue; }
      if (px + pw * 0.9 > g.x && px + pw * 0.1 < g.x + g.w && py + ph * 0.9 > g.y && py < g.y + g.h) {
        s.gifts++;
        s.score += 15;
        burst(g.x + g.w / 2, g.y + g.h / 2, 12, '#ffd166');
        SOUND.sfx('gift');
        s.giftsArr.splice(k, 1);
        paintHud();
      }
    }

    for (var q = s.parts.length - 1; q >= 0; q--) {
      var pt = s.parts[q];
      pt.x -= s.speed * dt * 0.6;
      pt.vy += 700 * dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
      if (pt.life <= 0) s.parts.splice(q, 1);
    }
    s.flakes.forEach(function (f) {
      f.y += f.v * dt;
      f.x -= (s.speed * 0.12 + Math.sin(f.d + s.t) * 6) * dt;
      if (f.y > H) { f.y = -4; f.x = Math.random() * W; }
      if (f.x < -6) f.x = W + 4;
    });

    s.score = Math.floor(s.dist / 12) + s.gifts * 15;
    if (s.t - (s._paint || 0) > 0.2) { s._paint = s.t; paintHud(); }
  }

  function hurt(o) {
    s.lives--;
    s.player.inv = 1.25;
    s.shake = 1;
    s.speed = Math.max(300, s.speed * 0.82);
    burst(o.x + o.w / 2, s.groundY - o.h * 0.6, 18, '#ffffff');
    SOUND.sfx('hurt');
    paintHud();
    if (s.lives <= 0) endGame();
  }

  function burst(x, y, n, color) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.283, sp = 60 + Math.random() * 220;
      s.parts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, r: 2 + Math.random() * 3, life: .5 + Math.random() * .5, c: color || '#fff' });
    }
  }

  function paintHud() {
    if (!s) return;
    var e1 = document.getElementById('slScore'); if (e1) e1.textContent = SNOW.fmtNum(s.score);
    var e2 = document.getElementById('slGifts'); if (e2) e2.textContent = String(s.gifts);
    var e3 = document.getElementById('slLives'); if (e3) e3.textContent = '❤'.repeat(Math.max(0, s.lives)) + '♡'.repeat(Math.max(0, 3 - s.lives));
  }

  function draw() {
    if (!s) return;
    var g = ctx;
    g.save();
    if (s.shake > 0) g.translate((Math.random() - .5) * 8 * s.shake, (Math.random() - .5) * 8 * s.shake);

    /* 밤하늘 */
    var sky = g.createLinearGradient(0, 0, 0, s.groundY);
    sky.addColorStop(0, '#081634');
    sky.addColorStop(.5, '#173163');
    sky.addColorStop(1, '#3d5f9c');
    g.fillStyle = sky;
    g.fillRect(-20, -20, W + 40, s.groundY + 20);

    /* 별 */
    for (var i = 0; i < 46; i++) {
      g.globalAlpha = 0.3 + ((i * 9) % 10) / 16;
      g.fillStyle = '#fff';
      g.beginPath(); g.arc((i * 149.7) % W, (i * 61.3) % (s.groundY * 0.7), 1.2, 0, 6.283); g.fill();
    }
    g.globalAlpha = 1;

    /* 오로라 */
    for (var a = 0; a < 3; a++) {
      var grad = g.createLinearGradient(0, 60 + a * 40, W, 140 + a * 40);
      grad.addColorStop(0, 'rgba(120, 240, 200, 0)');
      grad.addColorStop(.45, 'rgba(120, 240, 200, ' + (0.1 - a * 0.02) + ')');
      grad.addColorStop(1, 'rgba(150, 180, 255, 0)');
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(0, 70 + a * 30);
      g.bezierCurveTo(W * .3, 20 + a * 40 + Math.sin(s.t * .3 + a) * 20, W * .7, 150 + a * 20, W, 80 + a * 30);
      g.lineTo(W, 190 + a * 30);
      g.bezierCurveTo(W * .7, 250 + a * 20, W * .3, 120 + a * 40, 0, 170 + a * 30);
      g.closePath(); g.fill();
    }

    /* 먼 산 */
    g.fillStyle = 'rgba(180, 210, 245, .22)';
    g.beginPath();
    g.moveTo(-10, s.groundY);
    for (var m = 0; m <= 10; m++) {
      var mx = (m / 10) * W;
      var mh = 90 + Math.sin(m * 1.7) * 50;
      g.lineTo(mx, s.groundY - mh);
    }
    g.lineTo(W + 10, s.groundY);
    g.closePath(); g.fill();

    /* 나무(패럴랙스) */
    var off1 = (s.dist * 0.25) % 260;
    for (var t1 = -1; t1 < W / 260 + 2; t1++) {
      drawTree(g, t1 * 260 - off1 + 40, s.groundY + 8, 96, 'rgba(18, 52, 74, .5)');
      drawTree(g, t1 * 260 - off1 + 170, s.groundY + 8, 66, 'rgba(18, 52, 74, .35)');
    }
    var off2 = (s.dist * 0.6) % 190;
    for (var t2 = -1; t2 < W / 190 + 2; t2++) {
      drawTree(g, t2 * 190 - off2 + 20, s.groundY + 10, 74, 'rgba(12, 36, 58, .75)');
    }

    /* 눈 언덕 */
    var gg = g.createLinearGradient(0, s.groundY - 10, 0, H);
    gg.addColorStop(0, '#f3faff');
    gg.addColorStop(.5, '#dcecff');
    gg.addColorStop(1, '#b9d4f0');
    g.fillStyle = gg;
    g.beginPath();
    g.moveTo(0, s.groundY + 6);
    g.bezierCurveTo(W * .35, s.groundY - 8, W * .7, s.groundY + 16, W, s.groundY - 2);
    g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();

    /* 눈 반짝이 */
    for (var sp = 0; sp < 34; sp++) {
      var sx2 = (sp * 151.7 + s.dist * 0.25) % W;
      var sy2 = s.groundY + 20 + ((sp * 37) % 165);
      g.fillStyle = 'rgba(180, 208, 240, ' + (0.35 + (sp % 4) * 0.12).toFixed(2) + ')';
      g.beginPath(); g.arc(sx2, sy2, 1.6 + (sp % 3) * 0.5, 0, 6.283); g.fill();
    }

    /* 썰매 자국 */
    g.strokeStyle = 'rgba(150, 185, 225, .55)';
    g.lineWidth = 2;
    g.setLineDash([14, 12]);
    g.lineDashOffset = -(s.dist % 26);
    g.beginPath();
    g.moveTo(0, s.groundY + 22); g.lineTo(W, s.groundY + 22);
    g.moveTo(0, s.groundY + 34); g.lineTo(W, s.groundY + 34);
    g.stroke();
    g.setLineDash([]);

    /* 장애물 */
    s.obs.forEach(function (o) {
      if (o.type === 'tree') {
        drawTree(g, o.x + o.w / 2, s.groundY + 6, o.h, '#2c6b4f');
        g.fillStyle = 'rgba(255,255,255,.75)';
        g.beginPath(); g.ellipse(o.x + o.w / 2, s.groundY - o.h * .55, o.w * .34, 6, 0, 0, 6.283); g.fill();
      } else {
        g.save();
        g.translate(o.x + o.w / 2, s.groundY - o.h / 2);
        g.rotate(o.spin + s.dist / 400);
        g.fillStyle = '#eaf4ff';
        g.beginPath(); g.arc(0, 0, o.w / 2, 0, 6.283); g.fill();
        g.strokeStyle = '#bcd6f0'; g.lineWidth = 2; g.stroke();
        g.restore();
      }
    });

    /* 선물 */
    s.giftsArr.forEach(function (gi) {
      var y = gi.y + Math.sin(gi.bob) * 8;
      g.save();
      g.shadowColor = 'rgba(255, 214, 102, .9)';
      g.shadowBlur = 18;
      g.fillStyle = '#e8543f';
      roundRect(g, gi.x, y, gi.w, gi.h, 8); g.fill();
      g.shadowBlur = 0;
      g.fillStyle = '#ffd166';
      g.fillRect(gi.x + gi.w / 2 - 4, y, 8, gi.h);
      g.fillRect(gi.x, y + gi.h / 2 - 4, gi.w, 8);
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2;
      roundRect(g, gi.x, y, gi.w, gi.h, 8); g.stroke();
      g.restore();
    });

    /* 내 썰매 + 눈사람 */
    var p = s.player;
    var ph = 116, pw = 94;
    var px = p.x - pw / 2, py = s.groundY - ph + p.y;
    g.save();
    g.translate(p.x, s.groundY + p.y);
    g.rotate(p.tilt);
    g.translate(-p.x, -(s.groundY + p.y));
    /* 썰매 */
    g.fillStyle = '#8b5a2b';
    roundRect(g, px + 2, s.groundY - 12, pw - 4, 10, 5); g.fill();
    g.strokeStyle = '#d9b48a'; g.lineWidth = 3;
    g.beginPath();
    g.moveTo(px + pw - 8, s.groundY - 8);
    g.quadraticCurveTo(px + pw + 10, s.groundY - 6, px + pw + 6, s.groundY - 22);
    g.stroke();
    g.fillStyle = '#a5703c';
    g.fillRect(px + pw - 30, s.groundY - 26, 4, 16);
    var im = playerImg();
    if (p.inv > 0 && Math.floor(p.inv * 12) % 2 === 0) g.globalAlpha = 0.45;
    if (im.complete) g.drawImage(im, px, py - 14, pw, ph);
    g.globalAlpha = 1;
    g.restore();

    /* 조각 */
    s.parts.forEach(function (pt) {
      g.globalAlpha = Math.max(0, Math.min(1, pt.life * 1.8));
      g.fillStyle = pt.c;
      g.beginPath(); g.arc(pt.x, pt.y, pt.r, 0, 6.283); g.fill();
    });
    g.globalAlpha = 1;

    /* 눈 */
    g.fillStyle = 'rgba(255,255,255,.9)';
    s.flakes.forEach(function (f) {
      g.beginPath(); g.arc(f.x, f.y, f.r, 0, 6.283); g.fill();
    });

    /* 거리 표시 */
    g.fillStyle = 'rgba(255,255,255,.75)';
    g.font = '700 13px Pretendard, "Malgun Gothic", sans-serif';
    g.textAlign = 'right';
    g.fillText(Math.floor(s.dist / 40) + 'm', W - 16, 26);
    g.textAlign = 'left';

    g.restore();
  }

  function drawTree(g, x, y, h, color) {
    g.fillStyle = color;
    g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + h * 0.3, y); g.lineTo(x - h * 0.3, y); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(x, y - h * 0.78); g.lineTo(x + h * 0.4, y - h * 0.08); g.lineTo(x - h * 0.4, y - h * 0.08); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.55)';
    g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + h * 0.12, y - h * 0.62); g.lineTo(x - h * 0.12, y - h * 0.62); g.closePath(); g.fill();
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
    var st = document.getElementById('slStart');
    var rs = document.getElementById('slResult');
    if (st) st.classList.add('hidden');
    if (rs) rs.classList.add('hidden');
    running = true; last = 0;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
    SOUND.sfx('pop');
  }

  function endGame() {
    if (!s || s.over) return;
    s.over = true;
    running = false;
    cancelAnimationFrame(raf);
    SOUND.sfx('win');
    var f = document.getElementById('slFinal'); if (f) f.textContent = SNOW.fmtNum(s.score);
    var l = document.getElementById('slLine');
    if (l) l.textContent = '선물 ' + s.gifts + '개를 모았어요 · ' + Math.floor(s.dist / 40) + 'm 달렸어요!';
    var rs = document.getElementById('slResult'); if (rs) rs.classList.remove('hidden');
    if (opts.onScore) opts.onScore(s.score, s.gifts);
  }

  function bind() {
    if (bound) return;
    bound = true;
    cv.addEventListener('pointerdown', function (e) { e.preventDefault(); jump(); });
    document.addEventListener('keydown', function (e) {
      if (!running) return;
      if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); }
    });
    window.addEventListener('resize', function () { if (running) resize(); });
  }

  function open(o) {
    opts = Object.assign(opts, o || {});
    cv = document.getElementById('slCanvas');
    ctx = cv.getContext('2d');
    bind();
    resize();
    if (running) { running = false; cancelAnimationFrame(raf); }
    s = null;
    var st0 = document.getElementById('slStart');
    var rs0 = document.getElementById('slResult');
    if (st0) st0.classList.remove('hidden');
    if (rs0) rs0.classList.add('hidden');
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#081634'); sky.addColorStop(1, '#3d5f9c');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  }

  function close() {
    running = false;
    cancelAnimationFrame(raf);
    s = null;
    var st = document.getElementById('slStart');
    var rs = document.getElementById('slResult');
    if (st) st.classList.remove('hidden');
    if (rs) rs.classList.add('hidden');
  }

  return { open: open, start: start, close: close, jump: jump, isRunning: function () { return running; } };
})();
