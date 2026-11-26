/* ══════════════════════════════════════════════════════════════
   net.js — 실시간 연결 (Supabase Realtime Broadcast + Presence)

   · 방 채널 하나(santa1-room-1225)만 씁니다. 40~50명 접속 시
     각자 자기 상태(presence)만 track 하고, 사건은 broadcast 로 보냅니다.
   · Supabase 에 닿지 못하면(학교망 차단 등) 같은 브라우저 탭끼리
     BroadcastChannel 로 이어서 동작합니다. (수업 중 연결 문제 대비)
   ══════════════════════════════════════════════════════════════ */
window.NET = (function () {
  var CFG = SNOW.CFG;
  var st = {
    mode: 'none',          // supabase | local
    status: 'idle',        // idle | connecting | online | offline
    client: null,
    ch: null,
    me: null,
    role: '',
    peers: {},             // id -> meta
    handlers: {},
    hbTimer: null,
    retry: 0,
    closed: false,
    bc: null
  };

  function on(evt, fn) {
    (st.handlers[evt] = st.handlers[evt] || []).push(fn);
  }
  function emit(evt, p) {
    (st.handlers[evt] || []).forEach(function (fn) {
      try { fn(p); } catch (e) { /* 한 리스너 오류가 전체를 막지 않게 */ }
    });
  }
  function setStatus(s) {
    if (st.status === s) return;
    st.status = s;
    emit('status', { status: s, mode: st.mode });
  }

  function roomName() { return CFG.CH_PREFIX + '-room-' + CFG.ROOM; }

  /* ── 공통: 멤버 목록 ─────────────────────────────────────── */
  function members() {
    var out = [];
    Object.keys(st.peers).forEach(function (k) {
      var m = st.peers[k];
      if (m && m.id) out.push(m);
    });
    return out;
  }
  function students() { return members().filter(function (m) { return m.role === 'student'; }); }

  /* ── Supabase 백엔드 ─────────────────────────────────────── */
  function startSupabase() {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      return false;
    }
    st.mode = 'supabase';
    setStatus('connecting');
    try {
      st.client = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
        realtime: { params: { eventsPerSecond: 20 } }
      });
    } catch (e) {
      return false;
    }

    var ch = st.client.channel(roomName(), {
      config: {
        broadcast: { self: false, ack: false },
        presence: { key: st.me.id }
      }
    });
    st.ch = ch;

    ch.on('presence', { event: 'sync' }, function () {
      if (ch !== st.ch) return;
      var map = ch.presenceState() || {};
      var next = {};
      Object.keys(map).forEach(function (key) {
        (map[key] || []).forEach(function (m) {
          if (m && m.id) next[m.id] = m;
        });
      });
      st.peers = next;
      emit('members', members());
    });

    ['snowman', 'wish', 'score', 'round', 'cheer', 'hello', 'bye'].forEach(function (ev) {
      ch.on('broadcast', { event: ev }, function (msg) {
        var p = (msg && msg.payload) || {};
        if (p.from && p.from === st.me.id) return;
        emit(ev, p);
      });
    });

    ch.subscribe(function (s) {
      if (ch !== st.ch) return;
      if (s === 'SUBSCRIBED') {
        st.retry = 0;
        setStatus('online');
        track({});
        startHb();
      } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
        if (st.closed) return;
        setStatus('offline');
        scheduleRetry();
      }
    });
    return true;
  }

  function scheduleRetry() {
    if (st.closed || st.mode !== 'supabase') return;
    st.retry += 1;
    if (st.retry > 3) {          // 계속 안 되면 탭 간 모드로 내려간다
      try { st.client.removeChannel(st.ch); } catch (e) {}
      st.ch = null;
      startLocal('supabase 연결 실패');
      return;
    }
    setTimeout(function () {
      if (st.closed) return;
      try { st.client.removeChannel(st.ch); } catch (e) {}
      st.ch = null;
      startSupabase();
    }, Math.min(1500 * st.retry, 5000));
  }

  /* ── 탭 간(BroadcastChannel) 백엔드 ──────────────────────── */
  function startLocal(reason) {
    if (st.bc) return;
    st.mode = 'local';
    st.ch = null;
    if (!('BroadcastChannel' in window)) { setStatus('offline'); return; }
    st.bc = new BroadcastChannel(roomName());
    st.bc.onmessage = function (e) {
      var d = e.data || {};
      if (!d.evt) return;
      if (d.from && d.from === st.me.id) return;
      if (d.evt === 'presence') {
        st.peers[d.meta.id] = d.meta;
        emit('members', members());
        return;
      }
      if (d.evt === 'leave') {
        delete st.peers[d.from];
        emit('members', members());
        return;
      }
      if (d.evt === 'hello') {
        st.peers[d.meta.id] = d.meta;
        emit('members', members());
        send('presence', st.me);   // 내 상태를 바로 알려 준다
        return;
      }
      emit(d.evt, d.payload || {});
      if (d.meta) { st.peers[d.meta.id] = d.meta; emit('members', members()); }
    };
    setStatus('online');
    send('hello', {}, st.me);
    startHb();
    emit('degraded', reason || '탭 간 연결');
  }

  function startHb() {
    stopHb();
    st.hbTimer = setInterval(function () {
      if (st.mode === 'local') send('presence', {}, st.me);
      /* 오래된 탭 상태 정리 */
      if (st.mode === 'local') {
        var now = Date.now(), changed = false;
        Object.keys(st.peers).forEach(function (k) {
          if (now - (st.peers[k].at || 0) > 15000) { delete st.peers[k]; changed = true; }
        });
        if (changed) emit('members', members());
      }
    }, 4000);
  }
  function stopHb() { if (st.hbTimer) clearInterval(st.hbTimer); st.hbTimer = null; }

  /* ── 공개 API ────────────────────────────────────────────── */
  function init(opts) {
    st.role = opts.role;
    st.me = Object.assign({ at: Date.now() }, opts.me, { role: opts.role });
    st.closed = false;
    var ok = startSupabase();
    if (!ok) startLocal('실시간 라이브러리 없음');
    return ok;
  }

  function track(patch) {
    st.me = Object.assign({}, st.me, patch || {}, { at: Date.now(), role: st.role });
    if (st.mode === 'supabase' && st.ch) {
      try { st.ch.track(st.me); } catch (e) {}
    } else if (st.mode === 'local') {
      send('presence', {}, st.me);
      emit('members', members());
    }
  }

  function send(evt, payload, meta) {
    var body = Object.assign({ from: st.me.id, at: Date.now() }, payload || {});
    if (st.mode === 'supabase' && st.ch) {
      try {
        var r = st.ch.send({ type: 'broadcast', event: evt, payload: body });
        if (r && r.catch) r.catch(function () {});
      } catch (e) {}
      return;
    }
    if (st.mode === 'local' && st.bc) {
      try { st.bc.postMessage({ evt: evt, from: st.me.id, payload: body, meta: meta || null }); } catch (e) {}
    }
  }

  function leave() {
    st.closed = true;
    stopHb();
    if (st.bc) { try { st.bc.postMessage({ evt: 'leave', from: st.me.id }); } catch (e) {} }
    if (st.ch && st.client) { try { st.client.removeChannel(st.ch); } catch (e) {} }
    st.ch = null;
    if (st.bc) { try { st.bc.close(); } catch (e) {} st.bc = null; }
    setStatus('idle');
  }

  return {
    init: init, on: on, send: send, track: track, leave: leave,
    members: members, students: students,
    me: function () { return st.me; },
    status: function () { return st.status; },
    mode: function () { return st.mode; }
  };
})();
