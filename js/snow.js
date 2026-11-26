/* ══════════════════════════════════════════════════════════════
   snow.js — 눈 내리는 효과 (가벼운 캔버스 파티클)
   ══════════════════════════════════════════════════════════════ */
window.makeSnow = function (canvas, opts) {
  if (!canvas) return { start: function () {}, stop: function () {} };
  opts = opts || {};
  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0, flakes = [], raf = null, running = false;
  var density = opts.density || 90;
  var wind = opts.wind == null ? 0.45 : opts.wind;
  var speed = opts.speed || 1;

  function resize() {
    W = canvas.clientWidth || window.innerWidth;
    H = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var want = Math.round(density * Math.min(1.6, Math.max(0.55, W / 1400)));
    while (flakes.length < want) flakes.push(newFlake(true));
    if (flakes.length > want) flakes.length = want;
  }

  function newFlake(anywhere) {
    var r = Math.random() * 2.6 + 1.1;
    return {
      x: Math.random() * W,
      y: anywhere ? Math.random() * H : -10,
      r: r,
      vy: (0.35 + Math.random() * 1.15) * speed * (r / 2.2),
      vx: (Math.random() - 0.5) * wind,
      ph: Math.random() * Math.PI * 2,
      a: 0.35 + Math.random() * 0.55
    };
  }

  function frame(t) {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < flakes.length; i++) {
      var f = flakes[i];
      f.ph += 0.014;
      f.y += f.vy;
      f.x += f.vx + Math.sin(f.ph) * 0.5;
      if (f.y > H + 8) { flakes[i] = newFlake(false); continue; }
      if (f.x < -12) f.x = W + 10;
      if (f.x > W + 12) f.x = -10;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,' + f.a.toFixed(2) + ')';
      ctx.fill();
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    resize();
    if (opts.reduced) { running = false; return; }
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }
  window.addEventListener('resize', function () { if (running) resize(); });

  return { start: start, stop: stop };
};
