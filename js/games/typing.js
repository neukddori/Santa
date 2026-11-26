/* ══════════════════════════════════════════════════════════════
   typing.js — ⌨️ 겨울 타자 연습 (3가지 모드)
     1) 자리 연습    : 한글 자모·글쇠 자리 익히기 (키보드 그림)
     2) 캐롤·단어    : 캐롤 가사와 겨울 낱말 따라 치기 (타수·정확도)
     3) 끝말잇기     : 눈사람 AI와 타자로 끝말잇기 (두음법칙 지원)
   ══════════════════════════════════════════════════════════════ */
window.TYPING = (function () {
  var body = null;
  var mode = 'seat';
  var keyHandler = null;
  var seat = null;
  var word = null;
  var chain = null;

  /* ── 글쇠 배열 ─────────────────────────────────────────── */
  var ROWS = [
    [['Q', 'ㅂ', 'f0'], ['W', 'ㅈ', 'f1'], ['E', 'ㄷ', 'f2'], ['R', 'ㄱ', 'f3'], ['T', 'ㅅ', 'f3'],
     ['Y', 'ㅛ', 'f4'], ['U', 'ㅕ', 'f4'], ['I', 'ㅑ', 'f2'], ['O', 'ㅐ', 'f1'], ['P', 'ㅔ', 'f0']],
    [['A', 'ㅁ', 'f0'], ['S', 'ㄴ', 'f1'], ['D', 'ㅇ', 'f2'], ['F', 'ㄹ', 'f3'], ['G', 'ㅎ', 'f3'],
     ['H', 'ㅗ', 'f4'], ['J', 'ㅓ', 'f4'], ['K', 'ㅏ', 'f2'], ['L', 'ㅣ', 'f1']],
    [['Z', 'ㅋ', 'f0'], ['X', 'ㅌ', 'f1'], ['C', 'ㅊ', 'f2'], ['V', 'ㅍ', 'f3'], ['B', 'ㅠ', 'f4'],
     ['N', 'ㅜ', 'f4'], ['M', 'ㅡ', 'f4']]
  ];
  var CODE = {
    KeyQ: 'ㅂ', KeyW: 'ㅈ', KeyE: 'ㄷ', KeyR: 'ㄱ', KeyT: 'ㅅ', KeyY: 'ㅛ', KeyU: 'ㅕ', KeyI: 'ㅑ',
    KeyO: 'ㅐ', KeyP: 'ㅔ', KeyA: 'ㅁ', KeyS: 'ㄴ', KeyD: 'ㅇ', KeyF: 'ㄹ', KeyG: 'ㅎ', KeyH: 'ㅗ',
    KeyJ: 'ㅓ', KeyK: 'ㅏ', KeyL: 'ㅣ', KeyZ: 'ㅋ', KeyX: 'ㅌ', KeyC: 'ㅊ', KeyV: 'ㅍ', KeyB: 'ㅠ',
    KeyN: 'ㅜ', KeyM: 'ㅡ'
  };
  var JAMO_NAME = {
    'ㅁ': '미음', 'ㄴ': '니은', 'ㅇ': '이응', 'ㄹ': '리을', 'ㅅ': '시옷', 'ㅂ': '비읍', 'ㅈ': '지읒',
    'ㄷ': '디귿', 'ㄱ': '기역', 'ㅎ': '히읗', 'ㅋ': '키읔', 'ㅌ': '티읕', 'ㅊ': '치읓', 'ㅍ': '피읖',
    'ㅓ': '어', 'ㅏ': '아', 'ㅗ': '오', 'ㅜ': '우', 'ㅣ': '이', 'ㅑ': '야', 'ㅕ': '여', 'ㅛ': '요',
    'ㅠ': '유', 'ㅐ': '애', 'ㅔ': '에', 'ㅡ': '으'
  };
  var KEY_OF = {};
  Object.keys(CODE).forEach(function (code) { KEY_OF[CODE[code]] = code.replace('Key', ''); });

  var SEAT_SET = ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅓ', 'ㅏ', 'ㅗ', 'ㅜ', 'ㅣ', 'ㅁ', 'ㄴ', 'ㅇ', 'ㄹ',
    'ㅅ', 'ㅂ', 'ㅈ', 'ㄷ', 'ㄱ', 'ㅎ', 'ㅓ', 'ㅏ', 'ㅗ', 'ㅜ', 'ㅣ'];

  var LINES = [
    { tag: '캐롤', text: '징글벨 징글벨 징글 올 더 웨이' },
    { tag: '겨울 낱말', text: '눈사람 루돌프 목도리 장갑' },
    { tag: '캐롤', text: '고요한 밤 거룩한 밤' },
    { tag: '겨울 낱말', text: '크리스마스 트리에 불빛이 반짝' },
    { tag: '캐롤', text: '산타 할아버지 우리 마을에 오시네' },
    { tag: '겨울 낱말', text: '따뜻한 코코아 한 잔' },
    { tag: '겨울 낱말', text: '함박눈이 펑펑 내려요' },
    { tag: '캐롤', text: '우리 모두 메리 크리스마스' }
  ];

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function esc(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ── 공통 머리(모드 탭 통계) ───────────────────────────── */
  function statsBar(items) {
    var wrap = el('div', 'tp-stats');
    items.forEach(function (it) {
      var d = el('div', 'tp-stat');
      d.appendChild(el('span', '', it.label));
      var b = el('b', '', it.value);
      if (it.id) b.id = it.id;
      d.appendChild(b);
      wrap.appendChild(d);
    });
    return wrap;
  }

  /* ══════════ 모드 1 · 자리 연습 ══════════ */
  function buildSeat() {
    seat = { list: SEAT_SET.slice(), i: 0, correct: 0, wrong: 0, started: 0, done: false, elapsed: 0 };

    var top = el('div', 'tp-top');
    top.appendChild(el('div', 'tp-hint', '가운데 손가락을 기본 자리(ㅁㄴㅇㄹ)에 살포시 올려 놓고 시작해요!'));
    top.appendChild(statsBar([
      { label: '진행', value: '0 / ' + seat.list.length, id: 'stProg' },
      { label: '정확도', value: '100%', id: 'stAcc' },
      { label: '시간', value: '0초', id: 'stTime' }
    ]));
    body.appendChild(top);

    var card = el('div', 'tp-card seat-card');
    var keyBox = el('div', 'seat-key');
    keyBox.appendChild(el('div', 'sk-char', seat.list[0]));
    keyBox.appendChild(el('div', 'sk-name', JAMO_NAME[seat.list[0]] || ''));
    keyBox.appendChild(el('div', 'sk-pos', ''));
    card.appendChild(keyBox);
    var next = el('div', 'seat-next');
    next.innerHTML = '다음 글쇠: <b>' + esc(seat.list[1] || '') + '</b> · <span>' + esc(KEY_OF[seat.list[1]] || '') + '</span> 자리';
    card.appendChild(next);

    var kb = el('div', 'kb');
    ROWS.forEach(function (row) {
      var r = el('div', 'kb-row');
      row.forEach(function (k) {
        var key = el('div', 'key ' + k[2]);
        key.dataset.jamo = k[1];
        key.appendChild(el('span', '', k[1]));
        key.appendChild(el('span', 'kl', k[0]));
        r.appendChild(key);
      });
      kb.appendChild(r);
    });
    card.appendChild(kb);

    var legend = el('div', 'kb-legend');
    [['f0', '왼손 새끼'], ['f1', '왼손 약지'], ['f2', '왼손 가운데'], ['f3', '왼손 검지'], ['f4', '오른손 검지']]
      .forEach(function (l) {
        var d = el('div', 'kl-item');
        var dot = el('span', 'kl-dot ' + l[0]);
        d.appendChild(dot); d.appendChild(document.createTextNode(l[1]));
        legend.appendChild(d);
      });
    card.appendChild(legend);
    body.appendChild(card);

    paintSeat();
    startSeatTimer();

    keyHandler = function (e) {
      if (mode !== 'seat' || !seat || seat.done) return;
      var j = CODE[e.code];
      if (!j) return;
      e.preventDefault();
      if (!seat.started) seat.started = Date.now();
      var target = seat.list[seat.i];
      var keyEl = document.querySelector('.key[data-jamo="' + j + '"]');
      if (keyEl) {
        keyEl.classList.remove('press');
        void keyEl.offsetWidth;
        keyEl.classList.add('press');
      }
      if (j === target) {
        seat.correct++;
        seat.i++;
        SOUND.sfx('correct');
        keyBox.classList.remove('good'); void keyBox.offsetWidth; keyBox.classList.add('good');
        if (seat.i >= seat.list.length) return finishSeat();
        paintSeat();
      } else {
        seat.wrong++;
        SOUND.sfx('wrong');
        keyBox.classList.remove('bad'); void keyBox.offsetWidth; keyBox.classList.add('bad');
        paintStats();
      }
    };
    document.addEventListener('keydown', keyHandler);
  }

  function startSeatTimer() {
    clearInterval(seat.timer);
    seat.timer = setInterval(function () {
      if (!seat || seat.done) return;
      if (seat.started) {
        seat.elapsed = Math.round((Date.now() - seat.started) / 1000);
        var t = document.getElementById('stTime'); if (t) t.textContent = seat.elapsed + '초';
      }
    }, 500);
  }

  function paintSeat() {
    var j = seat.list[seat.i];
    var keyBox = document.querySelector('.seat-key');
    if (keyBox) {
      keyBox.querySelector('.sk-char').textContent = j;
      var nmEl = keyBox.querySelector('.sk-name');
      if (nmEl) nmEl.textContent = JAMO_NAME[j] || '';
      keyBox.querySelector('.sk-pos').textContent = KEY_OF[j] + ' 자리';
    }
    document.querySelectorAll('.key').forEach(function (k) {
      k.classList.toggle('target', k.dataset.jamo === j);
    });
    var next = document.querySelector('.seat-next');
    if (next && seat.list[seat.i + 1]) {
      next.innerHTML = '다음 글쇠: <b>' + esc(seat.list[seat.i + 1]) + '</b> · <span>' + esc(KEY_OF[seat.list[seat.i + 1]]) + '</span> 자리';
    } else if (next) {
      next.innerHTML = '마지막 글쇠예요!';
    }
    paintStats();
  }

  function paintStats() {
    if (!seat) return;
    var p = document.getElementById('stProg');
    var a = document.getElementById('stAcc');
    if (p) p.textContent = Math.min(seat.i, seat.list.length) + ' / ' + seat.list.length;
    if (a) {
      var tot = seat.correct + seat.wrong;
      a.textContent = (tot ? Math.round(seat.correct / tot * 100) : 100) + '%';
    }
  }

  function finishSeat() {
    seat.done = true;
    clearInterval(seat.timer);
    var firstCard = body.querySelector('.tp-card');
    if (firstCard) firstCard.style.display = 'none';
    var tot = seat.correct + seat.wrong;
    var acc = tot ? Math.round(seat.correct / tot * 100) : 100;
    paintStats();
    var card = el('div', 'tp-card');
    card.style.textAlign = 'center';
    card.innerHTML = '<div style="font-size:44px">🎉</div>' +
      '<div style="font-size:22px;font-weight:900;margin-top:6px">자리 연습을 마쳤어요!</div>' +
      '<div style="color:#6f7d9c;margin-top:6px;font-size:14px">정확도 <b>' + acc + '%</b> · ' +
      (seat.elapsed || 0) + '초 · 틀린 횟수 ' + seat.wrong + '번</div>';
    var btns = el('div', 'gr-btns');
    btns.style.marginTop = '16px';
    var again = el('button', 'gr-btn again', '한 번 더');
    again.style.color = '#5c3a00';
    again.onclick = function () { buildSeat(); };
    btns.appendChild(again);
    card.appendChild(btns);
    body.appendChild(card);
    SOUND.sfx('win');
  }

  /* ══════════ 모드 2 · 캐롤·단어 ══════════ */
  function buildWord() {
    word = { i: 0, correct: 0, wrong: 0, typed: 0, started: 0, done: false, elapsed: 0, errors: 0 };

    var top = el('div', 'tp-top');
    top.appendChild(el('div', 'tp-hint', '화면에 나온 문장을 그대로 따라 쳐 보세요. 띄어쓰기도 그대로!'));
    top.appendChild(statsBar([
      { label: '타수', value: '0타', id: 'wdCpm' },
      { label: '정확도', value: '100%', id: 'wdAcc' },
      { label: '시간', value: '0초', id: 'wdTime' }
    ]));
    body.appendChild(top);

    var card = el('div', 'tp-card word-card');
    var tag = el('div', 'tp-note', LINES[0].tag + ' · ' + (1) + ' / ' + LINES.length);
    tag.id = 'wdTag';
    card.appendChild(tag);
    var sen = el('div', 'tp-sentence');
    sen.id = 'wdSentence';
    card.appendChild(sen);
    var input = document.createElement('input');
    input.className = 'tp-input';
    input.id = 'wdInput';
    input.type = 'text';
    input.placeholder = '여기에 따라 치세요';
    input.autocomplete = 'off';
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('spellcheck', 'false');
    card.appendChild(input);
    var row = el('div', 'tp-row');
    var prog = el('div', 'tp-progress');
    var bar = el('i');
    prog.appendChild(bar);
    row.appendChild(prog);
    var skip = el('button', 'chain-btn', '건너뛰기 →');
    skip.onclick = function () { nextLine(); };
    row.appendChild(skip);
    card.appendChild(row);
    body.appendChild(card);

    var tips = el('div', 'tp-foot');
    tips.innerHTML =
      '<div><b>1.</b> 띄어쓰기까지 똑같이 치면 자동으로 다음 문장으로 넘어가요.</div>' +
      '<div><b>2.</b> 타수는 1분에 몇 글자를 쳤는지, 정확도는 맞게 친 글자의 비율이에요.</div>' +
      '<div><b>3.</b> 틀린 글자는 빨갛게 표시돼요. 지우고 다시 치면 됩니다.</div>';
    body.appendChild(tips);

    word.bar = bar;
    paintSentence('');

    input.addEventListener('input', function () {
      if (!word.started) word.started = Date.now();
      paintSentence(input.value);
      var target = LINES[word.i].text;
      if (input.value === target) {
        SOUND.sfx('correct');
        setTimeout(function () { nextLine(); }, 220);
      }
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        if (input.value.trim() === LINES[word.i].text.trim()) nextLine();
        else { SOUND.sfx('wrong'); word.errors++; }
      }
    });

    word.timer = setInterval(function () {
      if (!word || word.done || !word.started) return;
      var sec = (Date.now() - word.started) / 1000;
      word.elapsed = Math.round(sec);
      var t = document.getElementById('wdTime'); if (t) t.textContent = word.elapsed + '초';
      var c = document.getElementById('wdCpm');
      var inp2 = document.getElementById('wdInput');
      var live = word.correct + (inp2 ? inp2.value.length : 0);
      if (c) c.textContent = Math.round(live / Math.max(0.05, sec / 60)) + '타';
    }, 500);

    setTimeout(function () { input.focus(); }, 200);
  }

  function paintSentence(val) {
    var target = LINES[word.i].text;
    var html = '';
    var bad = 0;
    for (var i = 0; i < target.length; i++) {
      var ch = esc(target.charAt(i));
      if (i < val.length) {
        if (val.charAt(i) === target.charAt(i)) html += '<span class="ok">' + ch + '</span>';
        else { html += '<span class="bad">' + ch + '</span>'; bad++; }
      } else if (i === val.length) {
        html += '<span class="cur">' + ch + '</span>';
      } else {
        html += ch;
      }
    }
    var sen = document.getElementById('wdSentence');
    if (sen) sen.innerHTML = html;
    /* 정확도: 지금까지 맞춘 글자 / 친 글자 */
    var matched = 0;
    for (var k = 0; k < Math.min(val.length, target.length); k++) if (val.charAt(k) === target.charAt(k)) matched++;
    var acc = val.length ? Math.round(matched / val.length * 100) : 100;
    var a = document.getElementById('wdAcc');
    if (a) a.textContent = acc + '%';
    word.lastAcc = acc;
    word.typed = Math.max(word.typed, val.length);
  }

  function nextLine() {
    if (!word) return;
    word.correct += LINES[word.i].text.length;
    word.errAcc = word.lastAcc == null ? 100 : word.lastAcc;
    word.i++;
    var input = document.getElementById('wdInput');
    if (input) input.value = '';
    if (word.i >= LINES.length) return finishWord();
    var tag = document.getElementById('wdTag');
    if (tag) tag.textContent = LINES[word.i].tag + ' · ' + (word.i + 1) + ' / ' + LINES.length;
    var bar = word.bar;
    if (bar) bar.style.width = Math.round(word.i / LINES.length * 100) + '%';
    paintSentence('');
    if (input) input.focus();
    SOUND.sfx('pop');
  }

  function finishWord() {
    word.done = true;
    clearInterval(word.timer);
    var firstCard = body.querySelector('.tp-card');
    if (firstCard) firstCard.style.display = 'none';
    var sec = Math.max(1, (Date.now() - (word.started || Date.now())) / 1000);
    var cpm = Math.round(word.correct / (sec / 60));
    var card = el('div', 'tp-card');
    card.style.textAlign = 'center';
    card.innerHTML = '<div style="font-size:44px">⌨️</div>' +
      '<div style="font-size:22px;font-weight:900;margin-top:6px">문장 ' + LINES.length + '개를 모두 쳤어요!</div>' +
      '<div style="color:#6f7d9c;margin-top:8px;font-size:15px">타수 <b style="color:#2a4b8f;font-size:20px">' + cpm +
      '타</b> · 정확도 <b style="color:#2a4b8f;font-size:20px">' + (word.lastAcc || 100) + '%</b> · ' + Math.round(sec) + '초</div>';
    var btns = el('div', 'gr-btns');
    btns.style.marginTop = '16px';
    var again = el('button', 'gr-btn again', '한 번 더');
    again.onclick = function () { buildWord(); };
    btns.appendChild(again);
    card.appendChild(btns);
    body.appendChild(card);
    SOUND.sfx('win');
  }

  /* ══════════ 모드 3 · 끝말잇기 ══════════ */
  function buildChain() {
    chain = { history: [], used: {}, score: 0, current: '', wins: 0, attempts: 0, busy: false };

    var top = el('div', 'tp-top');
    top.appendChild(el('div', 'tp-hint', '눈사람이 마지막 글자로 시작하는 낱말을 이어 갑니다. 사전에 있는 쉬운 낱말만 나와요!'));
    top.appendChild(statsBar([
      { label: '이어간 낱말', value: '0개', id: 'chScore' },
      { label: '내가 이긴 횟수', value: '0번', id: 'chWin' }
    ]));
    body.appendChild(top);

    var card = el('div', 'tp-card');
    var stage = el('div', 'chain-stage');
    stage.id = 'chStage';
    card.appendChild(stage);

    var msg = el('div', 'chain-msg');
    msg.id = 'chMsg';
    card.appendChild(msg);

    var row = el('div', 'chain-input-row');
    var input = document.createElement('input');
    input.className = 'chain-input';
    input.id = 'chInput';
    input.placeholder = '낱말을 이어 주세요';
    input.autocomplete = 'off';
    input.spellcheck = false;
    row.appendChild(input);
    var go = el('button', 'chain-go', '보내기');
    go.onclick = submitChain;
    row.appendChild(go);
    card.appendChild(row);

    var help = el('div', 'chain-help');
    var hintBtn = el('button', 'chain-btn', '💡 힌트 보기');
    hintBtn.onclick = function () {
      var h = WORDS.hint(WORDS.lastSyl(chain.current));
      if (!h) { setChMsg("이 글자로 시작하는 낱말이 없어요. '모르겠어요'를 눌러 볼까요?", false); return; }
      setChMsg('힌트: ' + h + ' 처럼 이어 볼 수 있어요!', true);
    };
    var giveupBtn = el('button', 'chain-btn', '🙈 모르겠어요');
    giveupBtn.onclick = giveUp;
    var restartBtn = el('button', 'chain-btn', '🔄 처음부터');
    restartBtn.onclick = function () { buildChain(); };
    help.appendChild(hintBtn); help.appendChild(giveupBtn); help.appendChild(restartBtn);
    card.appendChild(help);

    var hist = el('div', 'chain-history');
    hist.id = 'chHistory';
    card.appendChild(hist);
    body.appendChild(card);

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); submitChain(); }
    });

    aiStart();
    setTimeout(function () { input.focus(); }, 200);
  }

  function setChMsg(t, ok) {
    var m = document.getElementById('chMsg');
    if (!m) return;
    m.textContent = t || '';
    m.classList.toggle('ok', !!ok);
  }

  function bubble(who, wordText, sub) {
    var b = el('div', 'chain-bubble ' + who);
    var face = el('div', 'cb-face', who === 'ai' ? '⛄' : '🙋');
    var box = el('div');
    var m = el('div', 'cb-msg', wordText);
    box.appendChild(m);
    if (sub) box.appendChild(el('div', 'cb-sub', sub));
    b.appendChild(face); b.appendChild(box);
    return b;
  }

  function pushChain(who, w, sub) {
    var stage = document.getElementById('chStage');
    if (!stage) return;
    stage.appendChild(bubble(who, w, sub));
    /* 너무 길어지면 앞부분 정리 */
    while (stage.children.length > 6) stage.removeChild(stage.firstChild);
    stage.scrollIntoView({ block: 'nearest' });
    var h = document.getElementById('chHistory');
    if (h) {
      h.innerHTML = '';
      chain.history.slice(-10).forEach(function (x, i) {
        var c = el('span', 'ch-chip' + (i === 0 ? ' first' : ''), x);
        h.appendChild(c);
      });
    }
    var sc = document.getElementById('chScore');
    if (sc) sc.textContent = (chain.history.length - 1) + '개';
    var wc = document.getElementById('chWin');
    if (wc) wc.textContent = chain.wins + '번';
  }

  function aiStart() {
    chain.history = [];
    chain.used = {};
    var w = WORDS.randomStart(chain.history);
    chain.current = w;
    chain.used[w] = true;
    chain.history.push(w);
    var stage = document.getElementById('chStage');
    if (stage) stage.innerHTML = '';
    pushChain('ai', w, '산타 눈사람: "' + WORDS.lastSyl(w) + '"(으)로 시작하는 낱말을 이어 주세요!');
    setChMsg('');
    var input = document.getElementById('chInput');
    if (input) { input.value = ''; input.focus(); }
  }

  function submitChain() {
    if (!chain || chain.busy) return;
    var input = document.getElementById('chInput');
    if (!input) return;
    var raw = input.value.trim().replace(/\s+/g, '');
    if (!raw) { setChMsg('낱말을 적어 주세요!', false); return; }
    if (!/^[가-힣]+$/.test(raw)) { SOUND.sfx('wrong'); setChMsg('한글로 적어 주세요!', false); return; }

    var need = WORDS.lastSyl(chain.current);
    var allowed = WORDS.starts(need);

    if (WORDS.isBlocked(raw)) { SOUND.sfx('wrong'); setChMsg('다른 낱말로 이어 볼까요?', false); input.value = ''; return; }
    if (chain.used[raw]) { SOUND.sfx('wrong'); setChMsg('이미 나온 낱말이에요! 다른 낱말로 해 볼까요?', false); return; }
    if (allowed.indexOf(raw.charAt(0)) < 0) {
      SOUND.sfx('wrong');
      setChMsg("'" + need + "'(으)로 시작하는 낱말이어야 해요!", false);
      return;
    }
    var known = WORDS.exists(raw);
    chain.used[raw] = true;
    chain.history.push(raw);
    pushChain('me', raw, known ? '나' : '나 · 사전에 없는 낱말');
    input.value = '';
    setChMsg(known ? '' : '이 낱말은 사전에 없지만 이어 볼게요! 눈사람이 모르면 네가 이겨요 😄', true);
    SOUND.sfx('correct');
    chain.busy = true;

    chain.current = raw;
    setTimeout(function () {
      if (!chain) return;
      try {
        var next = WORDS.pick(WORDS.lastSyl(raw), chain.used);
        if (!next) {
          chain.wins++;
          setChMsg("어? '" + WORDS.lastSyl(raw) + "'(으)로 시작하는 낱말이 없네요. 네가 이겼어! 🎉", true);
          pushChain('ai', '졌다…! 🎉', '산타 눈사람');
          SOUND.sfx('win');
          setTimeout(function () {
            if (chain) aiStart();
          }, 1900);
          return;
        }
        chain.used[next] = true;
        chain.history.push(next);
        chain.current = next;
        pushChain('ai', next, '산타 눈사람: "' + WORDS.lastSyl(next) + '"(으)로 이어 주세요!');
        setChMsg('');
        SOUND.sfx('pop');
        var i2 = document.getElementById('chInput');
        if (i2) i2.focus();
      } catch (e) {
        setChMsg('이번엔 이어가지 못했어요. 다시 한 번 해 볼까요?', false);
      } finally {
        if (chain) chain.busy = false;
      }
    }, 620);
  }

  function giveUp() {
    if (!chain || chain.busy) return;
    var need = WORDS.lastSyl(chain.current);
    var list = WORDS.candidates(need, chain.used);
    if (!list.length) {
      setChMsg("이 글자로 시작하는 낱말이 없어서 이번엔 무승부예요! 새로 시작할게요.", true);
      setTimeout(function () { aiStart(); }, 1400);
      return;
    }
    var w = list[Math.floor(Math.random() * Math.min(6, list.length))];
    chain.used[w] = true;
    chain.history.push(w);
    chain.current = w;
    pushChain('me', w, '내가 고른 낱말');
    setChMsg("'" + w + "'(으)로 이어 볼게요! 다음은 '" + WORDS.lastSyl(w) + "'(으)로 시작하는 낱말이에요.", true);
    SOUND.sfx('pop');
    setTimeout(function () {
      if (!chain) return;
      var next = WORDS.pick(WORDS.lastSyl(w), chain.used);
      if (!next) {
        chain.wins++;
        pushChain('ai', '졌다…! 🎉', '산타 눈사람');
        setChMsg('네가 이겼어요! 🎉', true);
        setTimeout(function () { if (chain) aiStart(); }, 1800);
        return;
      }
      chain.used[next] = true;
      chain.history.push(next);
      chain.current = next;
      pushChain('ai', next, '산타 눈사람: "' + WORDS.lastSyl(next) + '"(으)로 이어 주세요!');
    }, 620);
  }

  /* ══════════ 열기/닫기 ══════════ */
  function cleanup() {
    if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; }
    if (seat && seat.timer) { clearInterval(seat.timer); seat = null; }
    if (word && word.timer) { clearInterval(word.timer); word = null; }
    chain = null;
  }

  function open(which) {
    body = document.getElementById('typeBody');
    cleanup();
    body.innerHTML = '';
    if (which) mode = which;
    document.querySelectorAll('#typeTabs .tt').forEach(function (b) {
      b.classList.toggle('on', b.dataset.mode === mode);
    });
    if (mode === 'seat') buildSeat();
    else if (mode === 'word') buildWord();
    else buildChain();
  }

  function setMode(m) {
    mode = m;
    open(m);
  }

  return { open: open, setMode: setMode, cleanup: cleanup, mode: function () { return mode; } };
})();
