/* ══════════════════════════════════════════════════════════════
   config.js — 서버 주소 · 방 코드 · 공통 상수
   ══════════════════════════════════════════════════════════════ */
window.SNOW = window.SNOW || {};

SNOW.CFG = {
  /* 기존 몽글 Supabase 프로젝트 — Realtime Broadcast + Presence 만 사용(테이블 없음) */
  SUPABASE_URL: 'https://eufusduqrzgejwvkxlxh.supabase.co',
  SUPABASE_KEY: 'sb_publishable_qSYxfWPM9YTeKIP_Ct2mQg_UM_v7cZr',

  VERSION: 'v1.0',
  ROOM: '1225',          // 기본 방 코드 (매일 같은 링크)
  CH_PREFIX: 'santa1',   // 다른 앱(몽글 화면공유)과 섞이지 않게
  MAX_STUDENTS: 50,

  LANTERN_INVITE: '소원 등불을 띄워 보세요!'
};

SNOW.qs = function (key) {
  var m = new RegExp('[?&]' + key + '=([^&]*)').exec(location.search);
  return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
};

SNOW.uid = function () {
  return 's' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
};

SNOW.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

SNOW.fmtNum = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };

/* 한글 2~6자 검사 */
SNOW.validName = function (v) {
  v = (v || '').trim();
  if (v.length < 2 || v.length > 6) return false;
  return /^[가-힣]+$/.test(v);
};
