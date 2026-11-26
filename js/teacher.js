/* ══════════════════════════════════════════════════════════════
   teacher.js — 선생님 큰 화면
     · 접속 인원 / 마을 눈사람 / 도착 알림 / 소원 등불 / 미니게임 진행
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* 학생 링크로 들어오면 학생 화면으로 */
  if (SNOW.qs('role') === 'student') {
    location.replace('student.html' + location.search);
    return;
  }

  var $ = function (id) { return document.getElementById(id); };
  var stage = $('stage');

  /* ── 1920×1080 무대를 화면에 맞추기 ─────────────────── */
  function fitStage() {
    var z = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    document.documentElement.style.setProperty('--z', String(z));
  }
  fitStage();
  window.addEventListener('resize', fitStage);

  /* ── 연결 ─────────────────────────────────────────────── */
  var MY_ID = 'teacher-' + SNOW.uid();
  var isDemo = SNOW.qs('demo') === '1';

  NET.init({ role: 'teacher', me: { id: MY_ID, name: '선생님' } });

  /* ── 소리 ─────────────────────────────────────────────── */
  SOUND.init({ autostart: true });
  SOUND.toggle(true);                  // 화면 첫 클릭부터 캐롤이 흐릅니다

  var bgmBtn = $('bgmBtn'), bgmState = $('bgmState'), bgmSwitch = $('bgmSwitch');
  function paintBgm() {
    var on = SOUND.isOn();
    bgmState.textContent = on ? 'ON' : 'OFF';
    bgmState.classList.toggle('off', !on);
    bgmSwitch.classList.toggle('on', on);
    bgmBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  bgmBtn.addEventListener('click', function () {
    SOUND.toggle();
    paintBgm();
    SOUND.sfx('click');
  });
  paintBgm();

  /* ── 눈 ───────────────────────────────────────────────── */
  var snow = makeSnow($('snowCan'), { density: 110, speed: 1, wind: 0.55 });
  snow.start();

  /* ── 연결 상태 표시 ───────────────────────────────────── */
  var connPill = $('connPill');
  function paintConn() {
    var s = NET.status(), m = NET.mode();
    connPill.className = 'conn-pill' + (s === 'online' ? ' on' : s === 'idle' ? '' : ' off');
    var label = s === 'online'
      ? (m === 'supabase' ? '실시간 연결됨 · 방 1225' : '이 브라우저 안에서 연결됨 · 방 1225')
      : (s === 'connecting' ? '실시간 연결 중…' : '연결이 끊겼어요 · 다시 연결 중');
    connPill.querySelector('span').textContent = label;
  }
  NET.on('status', paintConn);
  NET.on('degraded', paintConn);
  paintConn();

  /* ── 학생 명단 ────────────────────────────────────────── */
  var demoStudents = [];

  function realStudents() {
    return NET.students().map(function (m) {
      return {
        id: m.id,
        name: m.name || '',
        hat: m.hat, scarf: m.scarf, face: m.face,
        sent: !!m.sent,
 	score: m.score || 0
      };
    });
  }
  function allStudents() { return realStudents().concat(demoStudents); }

  /* ── 마을 눈사람 배치 ─────────────────────────────────── */
  var SLOTS = (function () {
    var out = [];
    var rows = [
      { y: 0.702, n: 17, x0: 0.038, step: 0.0578, s: 0.78 },
      { y: 0.806, n: 17, x0: 0.064, step: 0.0575, s: 0.90 },
      { y: 0.916, n: 16, x0: 0.030, step: 0.0616, s: 1.00 }
    ];
    rows.forEach(function (r, ri) {
      for (var i = 0; i < r.n; i++) {
        var jx = Math.sin(i * 2.7 + ri * 1.7) * 0.004;
        var jy = Math.cos(i * 1.9 + ri * 2.3) * 0.006;
        out.push({
          x: Math.min(0.965, Math.max(0.028, r.x0 + i * r.step + jx)),
          y: r.y + jy,
          s: r.s * (0.96 + ((i * 7 + ri * 3) % 5) * 0.014),
          row: ri, idx: i
        });
      }
    });
    /* 가운데(트리 앞)부터 채우도록 정렬 — 학생이 적어도 화면 가운데에 모입니다 */
    out.sort(function (a, b) {
      var sa = Math.abs(a.x - 0.5) * 2 + Math.abs(a.row - 1) * 0.085;
      var sb = Math.abs(b.x - 0.5) * 2 + Math.abs(b.row - 1) * 0.085;
      return sa - sb;
    });
    return out;
  })();

  var slotOf = {};             // id -> slot index
  var used = {};
  var villagerEl = {};         // id -> 몸통 요소
  var tagEl = {};              // id -> 이름표 요소

  var VILLAGE_W = 1920, VILLAGE_H = 1080;

  function takeSlot(id) {
    if (slotOf[id] != null) return slotOf[id];
    for (var i = 0; i < SLOTS.length; i++) {
      if (!used[i]) { used[i] = id; slotOf[id] = i; return i; }
    }
    return SLOTS.length - 1;
  }
  function freeSlot(id) {
    var i = slotOf[id];
    if (i != null && used[i] === id) delete used[i];
    delete slotOf[id];
  }

  var village = $('village');
  var emptyCard = $('emptyCard');
  var tagLayer = $('tagLayer');

  function makeVillager(st) {
    var slot = SLOTS[takeSlot(st.id)] || SLOTS[0];
    var h = Math.round(142 * slot.s);
    var el = document.createElement('div');
    el.className = 'villager';
    el.dataset.id = st.id;
    el.style.left = (slot.x * 100).toFixed(2) + '%';
    el.style.top = (slot.y * 100).toFixed(2) + '%';
    el.style.setProperty('--w', Math.round(118 * slot.s) + 'px');
    el.style.setProperty('--h', h + 'px');
    el.style.setProperty('--wd', (6 + Math.random() * 5).toFixed(1) + 's');
    el.style.zIndex = String(100 + slot.row * 20 + slot.idx);

    var wander = document.createElement('div');
    wander.className = 'v-wander';
    var art = document.createElement('div');
    art.className = 'v-art';
    art.innerHTML = SNOWMAN.svg(SNOWMAN.sanitize(st));
    wander.appendChild(art);
    el.appendChild(wander);

    /* 이름표는 눈사람보다 위 레이어에 따로 둡니다 (앞줄에 가려지지 않게) */
    var tagWrap = document.createElement('div');
    tagWrap.className = 'v-tag';
    tagWrap.style.left = (slot.x * VILLAGE_W).toFixed(1) + 'px';
    tagWrap.style.top = (slot.y * VILLAGE_H - h - 4).toFixed(1) + 'px';
    tagWrap.style.zIndex = String(400 - slot.row * 10);
    var tag = document.createElement('span');
    tag.className = 'name-tag';
    tag.textContent = st.name || '친구';
    tagWrap.appendChild(tag);

    village.appendChild(el);
    if (tagLayer) tagLayer.appendChild(tagWrap);
    villagerEl[st.id] = el;
    tagEl[st.id] = tagWrap;
    return el;
  }

  function updateVillager(st) {
    var el = villagerEl[st.id];
    if (!el) return;
    var wrap = tagEl[st.id];
    if (wrap) {
      var tag = wrap.querySelector('.name-tag');
      if (tag && tag.textContent !== (st.name || '친구')) tag.textContent = st.name || '친구';
    }
    var art = el.querySelector('.v-art');
    var cfg = SNOWMAN.sanitize(st);
    var sig = [cfg.hat, cfg.scarf, cfg.face].join('|');
    if (art && art.dataset.sig !== sig) {
      art.dataset.sig = sig;
      art.innerHTML = SNOWMAN.svg(cfg);
    }
  }

  function removeVillager(id) {
    var el = villagerEl[id];
    var wrap = tagEl[id];
    if (el) {
      el.style.transition = 'opacity .4s ease, transform .4s ease';
      el.style.opacity = '0';
      el.style.transform = 'translate(-50%, -100%) scale(.6)';
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 420);
    }
    if (wrap) {
      wrap.style.transition = 'opacity .3s ease';
      wrap.style.opacity = '0';
      setTimeout(function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }, 320);
    }
    delete villagerEl[id];
    delete tagEl[id];
    freeSlot(id);
  }

  function renderVillage(opts) {
    opts = opts || {};
    var list = allStudents().filter(function (s) { return s.sent; });
    list.sort(function (a, b) {
      var sa = slotOf[a.id] == null ? 999 : slotOf[a.id];
      var sb = slotOf[b.id] == null ? 999 : slotOf[b.id];
      return sa - sb;
    });
    var alive = {};
    list.forEach(function (s) {
      alive[s.id] = true;
      if (!villagerEl[s.id]) {
        var el = makeVillager(s);
        if (!opts.silent) {
          el.classList.add('pop');
          setTimeout(function () { el.classList.remove('pop'); }, 1100);
          SOUND.sfx('arrive');
        }
      } else {
        updateVillager(s);
      }
    });
    Object.keys(villagerEl).forEach(function (id) {
      if (!alive[id]) removeVillager(id);
    });

    var n = list.length;
    emptyCard.classList.toggle('hide', n > 0);
  }

  function paintCounts() {
    var real = NET.students().length;
    var total = real + demoStudents.length;
    $('onlineNum').textContent = String(total);
    $('joinCount').textContent = String(total);
    if (demoStudents.length) {
      connPill.className = 'conn-pill on';
      connPill.querySelector('span').textContent = '시연 모드 · 친구 ' + demoStudents.length + '명은 화면 확인용이에요';
    } else {
      paintConn();
    }
    renderList();
  }

  NET.on('members', function () {
    renderVillage({ silent: true });
    paintCounts();
  });

  /* ── 토스트 ───────────────────────────────────────────── */
  var toastBox = $('toasts');
  var queue = [];
  var showing = 0;

  function showToast(emoji, main, sub) {
    queue.push({ emoji: emoji, main: main, sub: sub });
    pumpToasts();
  }
  function pumpToasts() {
    while (showing < 3 && queue.length) {
      var t = queue.shift();
      var el = document.createElement('div');
      el.className = 'toast';
      var ico = document.createElement('div');
      ico.className = 't-ico';
      ico.textContent = t.emoji;
      var body = document.createElement('div');
      var m = document.createElement('div'); m.className = 't-main'; m.textContent = t.main;
      var s = document.createElement('div'); s.className = 't-sub'; s.textContent = t.sub || '';
      body.appendChild(m); if (t.sub) body.appendChild(s);
      el.appendChild(ico); el.appendChild(body);
      toastBox.appendChild(el);
      showing++;
      requestAnimationFrame(function () { el.classList.add('in'); });
      setTimeout(function () {
        el.classList.remove('in');
        el.classList.add('out');
        setTimeout(function () {
          if (el.parentNode) el.parentNode.removeChild(el);
          showing--;
          pumpToasts();
        }, 320);
      }, 5600);
    }
  }

  /* 눈사람 도착은 잠깐 모았다가 한 번에 알려 줍니다 (40명 동시 도착 대비) */
  var arrivals = [];
  var arrivalTimer = null;
  function queueArrival(name) {
    arrivals.push(name);
    if (arrivalTimer) return;
    arrivalTimer = setTimeout(function () {
      arrivalTimer = null;
      var names = arrivals.slice();
      arrivals = [];
      var n = names.length;
      if (!n) return;
      var count = Object.keys(villagerEl).length;
      if (n === 1) showToast('⛄', names[0] + ' 님이 눈사람을 보냈어요!', '방금 도착 · 마을 눈사람 ' + count + '개');
      else showToast('⛄', names[0] + ' 님 외 ' + (n - 1) + '명이 눈사람을 보냈어요!', '방금 도착 · 마을 눈사람 ' + count + '개');
    }, 800);
  }

  NET.on('snowman', function (p) {
    if (!p || !p.id) return;
    var st = { id: p.id, name: p.name, hat: p.hat, scarf: p.scarf, face: p.face, sent: true };
    if (villagerEl[p.id]) {
      updateVillager(st);
      var el = villagerEl[p.id];
      el.classList.add('pop');
      setTimeout(function () { el.classList.remove('pop'); }, 1100);
    }
    queueArrival(p.name || '친구');
  });

  /* ── 소원 등불 ────────────────────────────────────────── */
  var lanternSky = $('lanternSky');
  var wishCount = 0;

  function spawnLantern(text, name, mine) {
    if (lanternSky.children.length > 46) lanternSky.removeChild(lanternSky.firstChild);
    var wrap = document.createElement('div');
    wrap.className = 'lantern';
    var left = 16 + Math.random() * 68;
    wrap.style.left = left.toFixed(2) + '%';
    wrap.style.setProperty('--dur', (34 + Math.random() * 12).toFixed(1) + 's');
    wrap.style.setProperty('--dx', ((Math.random() - 0.5) * 120).toFixed(0) + 'px');

    var inner = document.createElement('div');
    inner.className = 'lantern-inner';
    var top = document.createElement('div'); top.className = 'lantern-top';
    var paper = document.createElement('div'); paper.className = 'lantern-paper';
    paper.textContent = text;
    if (name) {
      var nm = document.createElement('div'); nm.className = 'lantern-name';
      nm.textContent = name + ' 님의 소원';
      paper.appendChild(nm);
    }
    inner.appendChild(top); inner.appendChild(paper);
    wrap.appendChild(inner);
    lanternSky.appendChild(wrap);
    wrap.addEventListener('animationend', function () {
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    });
    wishCount++;
  }

  var wishBuffer = [];
  var wishTimer = null;
  NET.on('wish', function (p) {
    if (!p || !p.text) return;
    var text = String(p.text).slice(0, 70);
    spawnLantern(text, p.name || '친구', false);
    wishBuffer.push(p.name || '친구');
    if (wishTimer) return;
    wishTimer = setTimeout(function () {
      wishTimer = null;
      var names = wishBuffer.slice(); wishBuffer = [];
      if (!names.length) return;
      if (names.length === 1) showToast('🏮', names[0] + ' 님이 소원 등불을 띄웠어요!', '하늘로 둥실둥실 올라가는 중');
      else showToast('🏮', names[0] + ' 님 외 ' + (names.length - 1) + '명이 소원을 띄웠어요!', '하늘로 둥실둥실 올라가는 중');
    }, 900);
  });

  /* ── 하늘 안내 문구 ───────────────────────────────────── */
  var skyText = $('skyNote').querySelector('.sn-text');
  var skyTimer = null;
  function setSky(text, hold) {
    skyText.textContent = text;
    var note = $('skyNote');
    note.classList.remove('flash');
    void note.offsetWidth;
    note.classList.add('flash');
    if (skyTimer) clearTimeout(skyTimer);
    if (hold) skyTimer = setTimeout(function () { skyText.textContent = '소원 등불이 별빛으로 올라가는 중…'; }, hold);
  }

  /* ── 라운드 ───────────────────────────────────────────── */
  var round = { kind: null, until: 0, timer: null, game: null };
  var board = $('board');
  var scores = {};      // id -> {name, score}
  var ROUND_INFO = {
    snow: { emoji: '❄️', title: '눈싸움 시작!', sub: '학생 화면에서 눈덩이를 던져 보세요 · 60초', dur: 60, board: '❄️ 눈싸움 순위', foot: '맞힌 눈덩이 수만큼 점수가 올라가요.' },
    sled: { emoji: '🛷', title: '썰매 타임!', sub: '눈 언덕을 내려오며 선물을 모아 보세요 · 90초', dur: 90, board: '🛷 썰매 순위', foot: '멀리 갈수록 점수가 커져요.' },
    wish: { emoji: '🏮', title: '소원 등불 띄우기', sub: '학생 화면에서 소원을 적어 보내면 이 하늘로 올라옵니다', dur: 0, board: null }
  };

  function startRound(kind) {
    var info = ROUND_INFO[kind];
    if (!info) return;
    stopRound(true);
    round.kind = kind;
    round.game = (kind === 'snow' || kind === 'sled') ? kind : null;
    if (round.game) { scores = {}; paintBoard(); }
    NET.send('round', { kind: kind, dur: info.dur });

    var banner = $('roundBanner');
    $('rbEmoji').textContent = info.emoji;
    $('rbText').textContent = info.title;
    $('rbSub').textContent = info.sub;
    banner.classList.remove('hidden');

    if (kind === 'snow') { $('zoneSnow').classList.add('hot'); setSky('❄️ 눈싸움 구역에 눈덩이가 날아다녀요!', 4200); }
    if (kind === 'sled') { $('zoneSled').classList.add('hot'); setSky('🛷 썰매 구역이 들썩들썩해요!', 4200); }
    if (kind === 'wish') { setSky('🏮 친구들의 소원이 하늘로 올라갑니다', 5200); }

    if (info.board) {
      board.classList.remove('hidden');
      $('boardTitle').textContent = info.board;
      $('boardFoot').textContent = info.foot;
      paintBoard();
    }

    SOUND.sfx('win');

    if (info.dur > 0) {
      round.until = Date.now() + info.dur * 1000;
      tickRound();
      round.timer = setInterval(tickRound, 500);
    } else {
      round.until = Date.now() + 6000;
      round.timer = setTimeout(function () { stopRound(); }, 6000);
    }
  }

  function tickRound() {
    var left = Math.max(0, Math.round((round.until - Date.now()) / 1000));
    var info = ROUND_INFO[round.kind];
    if (!info) return;
    $('rbSub').textContent = info.sub + ' · 남은 시간 ' + left + '초';
    $('dockStatus').textContent = info.title.replace('!', '') + ' 진행 중 · ' + left + '초 남았어요';
    if (left <= 0) {
      stopRound();
      showEndBanner();
    }
  }

  function showEndBanner() {
    var banner = $('roundBanner');
    $('rbEmoji').textContent = '🎉';
    $('rbText').textContent = '수고했어요!';
    $('rbSub').textContent = '점수는 오른쪽 순위에 남아 있어요';
    banner.classList.remove('hidden');
    banner.style.animation = 'none';
    void banner.offsetWidth;
    banner.style.animation = '';
    SOUND.sfx('win');
    setTimeout(function () { banner.classList.add('hidden'); }, 4200);
  }

  function stopRound(keepBoard) {
    if (round.timer) { clearInterval(round.timer); clearTimeout(round.timer); }
    round.timer = null;
    round.kind = null;
    round.until = 0;
    $('roundBanner').classList.add('hidden');
    $('zoneSnow').classList.remove('hot');
    $('zoneSled').classList.remove('hot');
    $('dockStatus').textContent = '';
    if (!keepBoard) setTimeout(function () { if (!round.kind) board.classList.add('hidden'); }, 5000);
  }

  function paintBoard() {
    var list = $('boardList');
    list.innerHTML = '';
    var arr = Object.keys(scores).map(function (k) { return scores[k]; })
      .sort(function (a, b) { return b.score - a.score; }).slice(0, 6);
    if (!arr.length) {
      var li = document.createElement('li');
      li.innerHTML = '<span class="nm" style="color:#c3d5f2;font-weight:600">아직 점수가 없어요. 곧 도착합니다!</span>';
      list.appendChild(li);
      $('snowScoreTop').textContent = '';
      return;
    }
    arr.forEach(function (s, i) {
      var li = document.createElement('li');
      if (i === 0) li.className = 'top1';
      var r = document.createElement('span'); r.className = 'rank'; r.textContent = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : String(i + 1)));
      var nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = s.name;
      var sc = document.createElement('span'); sc.className = 'sc'; sc.textContent = SNOW.fmtNum(s.score) + '점';
      li.appendChild(r); li.appendChild(nm); li.appendChild(sc);
      list.appendChild(li);
    });
    if (round.kind === 'snow') $('snowScoreTop').textContent = '최고 ' + SNOW.fmtNum(arr[0].score) + '점';
  }

  NET.on('score', function (p) {
    if (!p || !p.id) return;
    var prev = scores[p.id];
    var sc = Number(p.score) || 0;
    /* 같은 놀이의 더 높은 점수만 남깁니다 */
    if (prev && prev.score >= sc && prev.game === p.game) return;
    scores[p.id] = { name: p.name || '친구', score: sc, game: p.game };
    if (round.game && p.game && round.game !== p.game) return;
    paintBoard();
  });

  /* ── 하단 독 ──────────────────────────────────────────── */
  $('btnWish').addEventListener('click', function () {
    SOUND.sfx('click');
    startRound('wish');
    showToast('🏮', '친구들에게 소원 등불을 띄우자고 알렸어요!', '학생 화면에 안내가 나타납니다');
  });
  $('btnSnow').addEventListener('click', function () {
    SOUND.sfx('click');
    startRound('snow');
    showToast('❄️', '눈싸움을 시작했어요!', '학생 화면에 눈싸움 놀이가 열립니다');
  });
  $('btnSled').addEventListener('click', function () {
    SOUND.sfx('click');
    startRound('sled');
    showToast('🛷', '썰매 타임을 시작했어요!', '학생 화면에 썰매 놀이가 열립니다');
  });

  /* ── 모달 ─────────────────────────────────────────────── */
  function openModal(id) {
    $(id).classList.add('open');
    if (id === 'joinModal') buildQR();
    if (id === 'listModal') renderList();
  }
  function closeModal(id) { $(id).classList.remove('open'); }
  document.querySelectorAll('[data-close]').forEach(function (b) {
    b.addEventListener('click', function () { closeModal(b.getAttribute('data-close')); });
  });
  document.querySelectorAll('.modal-back').forEach(function (back) {
    back.addEventListener('click', function (e) { if (e.target === back) back.classList.remove('open'); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') document.querySelectorAll('.modal-back.open').forEach(function (m) { m.classList.remove('open'); });
  });

  $('joinBtn').addEventListener('click', function () { openModal('joinModal'); });
  $('emptyJoin').addEventListener('click', function () { openModal('joinModal'); });
  $('listBtn').addEventListener('click', function () { openModal('listModal'); });

  $('fsBtn').addEventListener('click', function () {
    if (!document.fullscreenElement) {
      (document.documentElement.requestFullscreen || function () {}).call(document.documentElement).catch(function () {});
    } else {
      document.exitFullscreen().catch(function () {});
    }
  });

  /* 학생 주소 */
  function studentUrl() {
    var base = location.href.split('?')[0].split('#')[0];
    var dir = base.replace(/[^/]*$/, '');
    return dir + 'index.html?role=student&room=1225';
  }
  var url = studentUrl();
  $('stuUrl').textContent = url.replace(/^https?:\/\//, '');

  var qrBuilt = false;
  function buildQR() {
    if (qrBuilt) return;
    var box = $('qrTarget');
    if (typeof QRCode === 'undefined') {
      box.textContent = 'QR을 만들지 못했어요. 주소를 입력해 주세요.';
      return;
    }
    try {
      new QRCode(box, {
        text: url,
        width: 160,
        height: 160,
        colorDark: '#1d2a52',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
      qrBuilt = true;
    } catch (e) {
      box.textContent = 'QR을 만들지 못했어요.';
    }
  }

  $('copyUrl').addEventListener('click', function () {
    var btn = this;
    var done = function () {
      btn.textContent = '✅ 복사했어요!';
      setTimeout(function () { btn.textContent = '📋 주소 복사'; }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done).catch(function () { fallbackCopy(); });
    } else fallbackCopy();
    function fallbackCopy() {
      var ta = document.createElement('textarea');
      ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) {}
      document.body.removeChild(ta);
    }
  });

  /* ── 학생 명단 ────────────────────────────────────────── */
  function renderList() {
    var grid = $('nameGrid');
    if (!grid) return;
    var list = allStudents();
    var sent = list.filter(function (s) { return s.sent; }).length;
    grid.innerHTML = '';
    if (!list.length) {
      $('listSub').textContent = '아직 접속한 학생이 없습니다. 위 학생 입장 주소를 알려 주세요.';
      return;
    }
    $('listSub').textContent = '접속 ' + list.length + '명 · 눈사람을 보낸 학생 ' + sent + '명';
    list.forEach(function (s) {
      var d = document.createElement('div');
      d.className = 'name-chip' + (s.sent ? ' sent' : '');
      var dot = document.createElement('span'); dot.className = 'dot';
      var nm = document.createElement('span'); nm.textContent = s.name || '이름 없음';
      d.appendChild(dot); d.appendChild(nm);
      grid.appendChild(d);
    });
  }

  /* ── 시연용 친구 채우기 ───────────────────────────────── */
  var DEMO_NAMES = ['민준', '서연', '지우', '하준', '수아', '도윤', '예린', '시우', '지호', '유나', '하린', '건우',
    '지민', '서윤', '예준', '채원', '수빈', '준서', '다은', '은우', '소율', '현우', '지안', '민서',
    '윤호', '서아', '지훈', '아린', '태윤', '나윤', '도현', '하윤', '시윤', '주원', '예나', '재윤',
    '가온', '서진', '연우', '다인', '규민', '소민'];

  function fillDemo(count) {
    demoStudents = [];
    for (var i = 0; i < count; i++) {
      demoStudents.push({
        id: 'demo-' + i,
        name: DEMO_NAMES[i % DEMO_NAMES.length],
        hat: SNOWMAN.HATS[i % 4],
        scarf: SNOWMAN.SCARFS[(i * 3) % 4],
        face: SNOWMAN.FACES[(i * 5) % 4],
        sent: true, demo: true,
        score: 0
      });
    }
    renderVillage({ silent: true });
    paintCounts();
    setSky('🎬 시연 모드예요 · 실제 학생 접속이 아닙니다', 4200);
  }

  $('demoBtn').addEventListener('click', function () {
    if (demoStudents.length) {
      demoStudents = [];
      Object.keys(villagerEl).forEach(function (id) {
        if (id.indexOf('demo-') === 0) removeVillager(id);
      });
      renderVillage({ silent: true });
      paintCounts();
      this.textContent = '🎬 시연용 친구 42명 채워 보기';
      return;
    }
    fillDemo(42);
    this.textContent = '🎬 시연 친구 지우기';
  });

  /* ── 시작 ─────────────────────────────────────────────── */
  renderVillage({ silent: true });
  paintCounts();
  if (isDemo) {
    fillDemo(42);
    $('demoBtn').textContent = '🎬 시연 친구 지우기';
  }

  window.addEventListener('beforeunload', function () { NET.leave(); });
})();
