/* ══════════════════════════════════════════════════════════════
   student.js — 학생 화면
     · 눈사람 꾸미기 → 마을로 보내기
     · 4가지 놀이 열기 / 선생님 알림 받기 / 소원 등불 보내기
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var STORE = 'santa-village-me-v1';

  var me = {
    id: 's' + SNOW.uid(),
    name: '',
    hat: 'santa',
    scarf: 'green',
    face: 'smile',
    sent: false
  };

  /* 저장된 내 눈사람 */
  try {
    var saved = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (saved) {
      me.id = saved.id || me.id;
      me.name = saved.name || '';
      me.hat = saved.hat || me.hat;
      me.scarf = saved.scarf || me.scarf;
      me.face = saved.face || me.face;
    } else {
      localStorage.setItem(STORE, JSON.stringify({ id: me.id }));
    }
  } catch (e) {}

  function persist() {
    try {
      localStorage.setItem(STORE, JSON.stringify({ id: me.id, name: me.name, hat: me.hat, scarf: me.scarf, face: me.face }));
    } catch (e) {}
  }

  /* ── 배경·소리 ───────────────────────────────────────── */
  var snow = makeSnow($('snowCan'), { density: 70, speed: .9, wind: .4 });
  snow.start();
  SOUND.init({ autostart: false });

  var carolSwitch = $('carolSwitch');
  function paintCarol() {
    carolSwitch.classList.toggle('on', SOUND.isOn());
  }
  carolSwitch.addEventListener('click', function () {
    SOUND.toggle();
    paintCarol();
    SOUND.sfx('click');
  });
  paintCarol();
  setInterval(function () {
    var el = $('songName');
    if (el && SOUND.isOn()) el.textContent = SOUND.songName();
  }, 2500);

  /* ── 연결 ─────────────────────────────────────────────── */
  NET.init({ role: 'student', me: { id: me.id, name: me.name, hat: me.hat, scarf: me.scarf, face: me.face, sent: false } });

  function paintFriends() {
    var n = NET.students().filter(function (s) { return s.id !== me.id; }).length;
    $('friendNum').textContent = String(Math.max(0, n));
  }
  NET.on('members', paintFriends);
  NET.on('status', paintFriends);

  /* ── 꾸미기 ───────────────────────────────────────────── */
  var hatRow = $('hatRow'), scarfRow = $('scarfRow'), faceRow = $('faceRow');
  var HAT_EMOJI = { santa: '🎅', beanie: '🧢', crown: '👑', ribbon: '🎀' };

  SNOWMAN.HATS.forEach(function (h) {
    var b = document.createElement('button');
    b.className = 'opt';
    b.type = 'button';
    b.dataset.hat = h;
    b.innerHTML = '<span class="op-emoji">' + HAT_EMOJI[h] + '</span><span>' + SNOWMAN.HAT_LABEL[h] + '</span>';
    b.addEventListener('click', function () { me.hat = h; SOUND.sfx('click'); paintAll(); });
    hatRow.appendChild(b);
  });

  SNOWMAN.SCARFS.forEach(function (c) {
    var b = document.createElement('button');
    b.className = 'swatch';
    b.type = 'button';
    b.dataset.color = c;
    b.title = SNOWMAN.SCARF_LABEL[c] + ' 목도리';
    b.setAttribute('aria-label', SNOWMAN.SCARF_LABEL[c] + ' 목도리');
    b.addEventListener('click', function () { me.scarf = c; SOUND.sfx('click'); paintAll(); });
    scarfRow.appendChild(b);
  });

  SNOWMAN.FACES.forEach(function (f) {
    var b = document.createElement('button');
    b.className = 'opt';
    b.type = 'button';
    b.dataset.face = f;
    b.innerHTML = '<span class="op-emoji">' + SNOWMAN.FACE_EMOJI[f] + '</span><span>' + SNOWMAN.FACE_LABEL[f] + '</span>';
    b.addEventListener('click', function () { me.face = f; SOUND.sfx('click'); paintAll(); });
    faceRow.appendChild(b);
  });

  function paintAll() {
    var cfg = SNOWMAN.sanitize(me);
    $('pvArt').innerHTML = SNOWMAN.svg(cfg);
    document.querySelectorAll('#hatRow .opt').forEach(function (b) { b.classList.toggle('on', b.dataset.hat === me.hat); });
    document.querySelectorAll('#scarfRow .swatch').forEach(function (b) { b.classList.toggle('on', b.dataset.color === me.scarf); });
    document.querySelectorAll('#faceRow .opt').forEach(function (b) { b.classList.toggle('on', b.dataset.face === me.face); });
    var tag = $('pvTag');
    tag.textContent = me.name || '친구';
    persist();
    if (me.sent) scheduleTrack();
  }

  /* 디자인을 연달아 바꿔도 실시간 서버로는 1.2초에 한 번만 알립니다 */
  var trackTimer = null;
  function scheduleTrack() {
    if (trackTimer) return;
    trackTimer = setTimeout(function () {
      trackTimer = null;
      NET.track({ name: me.name, hat: me.hat, scarf: me.scarf, face: me.face, sent: true });
    }, 1200);
  }

  /* 이름 */
  var nameInput = $('nameInput');
  nameInput.value = me.name;
  nameInput.addEventListener('input', function () {
    var v = nameInput.value.replace(/[^가-힣]/g, '').slice(0, 6);
    if (v !== nameInput.value) nameInput.value = v;
    me.name = v;
    nameInput.classList.remove('bad');
    $('nameErr').textContent = '';
    $('pvTag').textContent = v || '친구';
    persist();
    if (me.sent && SNOW.validName(v)) {
      NET.track({ name: v, hat: me.hat, scarf: me.scarf, face: me.face, sent: true });
    }
  });
  nameInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); sendSnowman(); }
  });

  /* ── 마을로 보내기 ───────────────────────────────────── */
  var sendBtn = $('sendBtn');
  var sendTimer = null;

  function sendSnowman() {
    me.name = nameInput.value.trim();
    if (!SNOW.validName(me.name)) {
      nameInput.classList.add('bad');
      $('nameErr').textContent = me.name.length
        ? '이름은 한글 2~6자로 써 주세요!'
        : '이름을 먼저 써 주세요!';
      nameInput.focus();
      SOUND.sfx('wrong');
      return;
    }
    $('nameErr').textContent = '';
    me.sent = true;
    persist();
    NET.track({ name: me.name, hat: me.hat, scarf: me.scarf, face: me.face, sent: true });
    NET.send('snowman', { id: me.id, name: me.name, hat: me.hat, scarf: me.scarf, face: me.face });

    SOUND.sfx('arrive');
    sendBtn.classList.add('sent');
    sendBtn.querySelector('.sb-text').textContent = '마을에 보냈어요!';
    sendBtn.querySelector('.sb-ico').textContent = '✅';
    $('bNote').textContent = '선생님 화면에 이름표가 달려 나타났어요';
    miniToast('⛄ ' + me.name + ' 님의 눈사람이 마을에 도착했어요!');
    sprinkle();

    clearTimeout(sendTimer);
    sendTimer = setTimeout(function () {
      sendBtn.classList.remove('sent');
      sendBtn.querySelector('.sb-text').textContent = '마을로 보내기';
      sendBtn.querySelector('.sb-ico').textContent = '⛄';
      $('bNote').textContent = '모자를 바꾸면 친구들 화면에도 바로 바뀌어요';
    }, 3200);
  }
  sendBtn.addEventListener('click', sendSnowman);

  function sprinkle() {
    var pv = $('preview');
    for (var i = 0; i < 14; i++) {
      var s = document.createElement('span');
      s.textContent = ['❄', '✨', '⭐', '❅'][i % 4];
      s.style.cssText = 'position:absolute;left:' + (20 + Math.random() * 60) + '%;top:' + (30 + Math.random() * 40) +
        '%;font-size:' + (12 + Math.random() * 14) + 'px;pointer-events:none;z-index:5;opacity:0;' +
        'transition:transform 1.1s cubic-bezier(.2,.8,.3,1),opacity 1.1s ease;';
      pv.appendChild(s);
      (function (node) {
        requestAnimationFrame(function () {
          node.style.opacity = '1';
          node.style.transform = 'translate(' + ((Math.random() - .5) * 120) + 'px,' + (-70 - Math.random() * 90) + 'px) rotate(' + ((Math.random() - .5) * 180) + 'deg)';
          setTimeout(function () { node.style.opacity = '0'; }, 700);
          setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 1300);
        });
      })(s);
    }
  }

  paintAll();

  /* ── 알림 ─────────────────────────────────────────────── */
  var miniEl = $('miniToast');
  var miniTimer = null;
  function miniToast(text) {
    if (!miniEl) return;
    miniEl.textContent = text;
    miniEl.classList.add('show');
    clearTimeout(miniTimer);
    miniTimer = setTimeout(function () { miniEl.classList.remove('show'); }, 3200);
  }

  var lastSnow = {};
  NET.on('snowman', function (p) {
    if (!p || p.id === me.id) return;
    var now = Date.now();
    if (lastSnow[p.id] && now - lastSnow[p.id] < 8000) return;
    lastSnow[p.id] = now;
    miniToast('⛄ ' + (p.name || '친구') + ' 님이 마을에 눈사람을 보냈어요!');
    SOUND.sfx('pop');
  });

  NET.on('wish', function (p) {
    if (!p || p.from === me.id) return;
    miniToast('🏮 ' + (p.name || '친구') + ' 님이 소원 등불을 띄웠어요!');
  });

  /* ── 선생님 알림(라운드) ─────────────────────────────── */
  var roundPop = $('roundPop');
  var pending = null;
  var ROUND_UI = {
    snow: { emoji: '❄️', title: '선생님이 눈싸움을 시작했어요!', sub: '지금 들어가서 눈덩이를 던져 보세요', game: 'snow' },
    sled: { emoji: '🛷', title: '썰매 타임이 시작됐어요!', sub: '눈 언덕을 내려가며 선물을 모아 보세요', game: 'sled' },
    wish: { emoji: '🏮', title: '소원 등불을 띄워 보세요!', sub: '내 소원을 적으면 선생님 화면 하늘로 올라가요', game: 'wish' }
  };

  NET.on('round', function (p) {
    var ui = ROUND_UI[p && p.kind];
    if (!ui) return;
    pending = ui;
    $('rpEmoji').textContent = ui.emoji;
    $('rpTitle').textContent = ui.title;
    $('rpSub').textContent = ui.sub;
    $('rpGo').textContent = ui.game === 'wish' ? '소원 적기' : '지금 놀기';
    roundPop.classList.add('show');
    SOUND.sfx('arrive');
    var card = document.querySelector('.mcard[data-game="' + ui.game + '"]');
    if (card) {
      card.classList.remove('pulse');
      void card.offsetWidth;
      card.classList.add('pulse');
    }
    clearTimeout(roundPop._t);
    roundPop._t = setTimeout(function () { roundPop.classList.remove('show'); }, 25000);
  });

  $('rpGo').addEventListener('click', function () {
    roundPop.classList.remove('show');
    if (!pending) return;
    if (pending.game === 'wish') openWish();
    else openGame(pending.game);
  });
  $('rpClose').addEventListener('click', function () { roundPop.classList.remove('show'); });

  /* ── 놀이 열기 ────────────────────────────────────────── */
  var reportTimer = null;

  function reportScore(game, score) {
    if (!me.sent) return;
    NET.send('score', { id: me.id, name: me.name || '친구', game: game, score: score });
  }

  function openGame(name) {
    if (name === 'wish') { openWish(); return; }
    if (name === 'snow') {
      $('gameSnow').classList.add('open');
      SNOWBALL.open({
        cfg: SNOWMAN.sanitize(me),
        targets: friendTargets(),
        onScore: function (score) { reportScore('snow', score); }
      });
      SOUND.sfx('click');
      return;
    }
    if (name === 'sled') {
      $('gameSled').classList.add('open');
      SLED.open({
        cfg: SNOWMAN.sanitize(me),
        onScore: function (score) { reportScore('sled', score); }
      });
      SOUND.sfx('click');
      return;
    }
    if (name === 'type') {
      $('gameType').classList.add('open');
      TYPING.open();
      SOUND.sfx('click');
    }
  }

  function friendTargets() {
    var list = NET.students().filter(function (s) { return s.id !== me.id && s.name; });
    var out = list.slice(0, 7).map(function (s) {
      return { name: s.name, hat: s.hat, scarf: s.scarf, face: s.face };
    });
    if (!out.length) {
      out = [
        { name: '지우', hat: 'santa', scarf: 'red', face: 'smile' },
        { name: '서연', hat: 'beanie', scarf: 'blue', face: 'surprise' },
        { name: '하준', hat: 'crown', scarf: 'green', face: 'cool' },
        { name: '수아', hat: 'ribbon', scarf: 'yellow', face: 'smile' },
        { name: '도윤', hat: 'beanie', scarf: 'red', face: 'sleep' }
      ];
    }
    return out;
  }

  document.querySelectorAll('.mcard').forEach(function (c) {
    c.addEventListener('click', function () { openGame(c.dataset.game); });
  });

  function closeGame(id) {
    $(id).classList.remove('open');
    if (id === 'gameSnow' && window.SNOWBALL.close) SNOWBALL.close();
    if (id === 'gameSled' && window.SLED.close) SLED.close();
    if (id === 'gameType') TYPING.cleanup();
  }
  document.querySelectorAll('[data-close-game]').forEach(function (b) {
    b.addEventListener('click', function () { closeGame(b.getAttribute('data-close-game')); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    ['gameSnow', 'gameSled', 'gameType'].forEach(function (id) {
      if ($(id).classList.contains('open')) closeGame(id);
    });
  });

  $('sbStartBtn').addEventListener('click', function () {
    SNOWBALL.open({ cfg: SNOWMAN.sanitize(me), targets: friendTargets(), onScore: function (s) { reportScore('snow', s); } });
    SNOWBALL.start();
  });
  $('sbAgain').addEventListener('click', function () { SNOWBALL.start(); });
  $('slStartBtn').addEventListener('click', function () {
    SLED.open({ cfg: SNOWMAN.sanitize(me), onScore: function (s) { reportScore('sled', s); } });
    SLED.start();
  });
  $('slAgain').addEventListener('click', function () { SLED.start(); });

  document.querySelectorAll('#typeTabs .tt').forEach(function (b) {
    b.addEventListener('click', function () {
      TYPING.setMode(b.dataset.mode);
      SOUND.sfx('click');
    });
  });

  /* ── 소원 등불 ────────────────────────────────────────── */
  var wishModal = $('wishModal');
  var wishInput = $('wishInput');

  function openWish() {
    wishModal.classList.add('open');
    $('wishDone').classList.add('hidden');
    $('wishSend').classList.remove('hidden');
    wishInput.value = '';
    $('wishCount').textContent = '0';
    setTimeout(function () { wishInput.focus(); }, 150);
    SOUND.sfx('click');
  }

  wishInput.addEventListener('input', function () {
    $('wishCount').textContent = String(wishInput.value.length);
  });

  $('wishSend').addEventListener('click', function () {
    var text = wishInput.value.trim().replace(/\s+/g, ' ');
    if (!text) { wishInput.focus(); SOUND.sfx('wrong'); return; }
    var nm = (nameInput.value.trim() || me.name || '친구');
    NET.send('wish', { id: me.id, name: nm, text: text.slice(0, 60) });
    SOUND.sfx('win');
    $('wishSend').classList.add('hidden');
    $('wishDone').classList.remove('hidden');
    wishInput.blur();
  });
  $('wishAgain').addEventListener('click', function () {
    $('wishDone').classList.add('hidden');
    $('wishSend').classList.remove('hidden');
    wishInput.value = '';
    $('wishCount').textContent = '0';
    wishInput.focus();
  });

  document.querySelectorAll('[data-close]').forEach(function (b) {
    b.addEventListener('click', function () { $(b.getAttribute('data-close')).classList.remove('open'); });
  });
  wishModal.addEventListener('click', function (e) { if (e.target === wishModal) wishModal.classList.remove('open'); });

  /* ── 시작 ─────────────────────────────────────────────── */
  paintFriends();
  if (me.sent && me.name) {
    NET.track({ name: me.name, hat: me.hat, scarf: me.scarf, face: me.face, sent: true });
  }
  if (!me.name) setTimeout(function () { nameInput.focus(); }, 500);

  window.addEventListener('beforeunload', function () { NET.leave(); });
})();
