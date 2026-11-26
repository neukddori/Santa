/* ══════════════════════════════════════════════════════════════
   snowman.js — 눈사람 캐릭터(모자 4 · 목도리 4 · 표정 4) SVG 생성
   같은 그림을 선생님 화면·학생 화면·미니게임 캔버스에서 함께 씁니다.
   ══════════════════════════════════════════════════════════════ */
window.SNOWMAN = (function () {
  var HATS = ['santa', 'beanie', 'crown', 'ribbon'];
  var SCARFS = ['red', 'green', 'blue', 'yellow'];
  var FACES = ['smile', 'surprise', 'cool', 'sleep'];

  var SCARF_COLOR = {
    red:    { main: '#e0455a', dark: '#b92f45', light: '#f47b8c' },
    green:  { main: '#6fb14a', dark: '#4d8b2e', light: '#97cf72' },
    blue:   { main: '#3b7dd8', dark: '#2a5fae', light: '#71a5ec' },
    yellow: { main: '#f2c230', dark: '#cf9c12', light: '#ffdd74' }
  };

  var HAT_LABEL = { santa: '산타모자', beanie: '파란비니', crown: '왕관', ribbon: '리본' };
  var SCARF_LABEL = { red: '빨강', green: '초록', blue: '파랑', yellow: '노랑' };
  var FACE_LABEL = { smile: '웃음', surprise: '놀람', cool: '멋짐', sleep: '쿨쿨' };
  var FACE_EMOJI = { smile: '😊', surprise: '😮', cool: '😎', sleep: '😴' };

  function scarf(c) {
    var s = SCARF_COLOR[c] || SCARF_COLOR.red;
    return '' +
      '<g class="sm-scarf">' +
        /* 목에 감긴 부분 */
        '<path d="M70 148 q50 24 100 0 q4 10 2 20 q-52 22 -104 0 q-2 -10 2 -20 z" fill="' + s.main + '"/>' +
        '<path d="M72 151 q48 22 96 0 l1 8 q-49 21 -98 0 z" fill="' + s.light + '" opacity=".5"/>' +
        /* 늘어뜨린 끝 */
        '<path d="M134 164 q16 3 18 16 l3 48 q0 10 -11 10 q-10 0 -10 -11 l-2 -47 q-1 -12 2 -16 z" fill="' + s.main + '"/>' +
        '<path d="M138 180 l2 50" stroke="' + s.dark + '" stroke-width="2.6" opacity=".4" stroke-linecap="round"/>' +
        '<path d="M145 180 l2 50" stroke="' + s.dark + '" stroke-width="2.2" opacity=".26" stroke-linecap="round"/>' +
        '<g stroke="' + s.dark + '" stroke-width="2.2" stroke-linecap="round" opacity=".45">' +
          '<path d="M80 155 l0 12"/><path d="M94 159 l0 12"/><path d="M108 161 l0 12"/>' +
          '<path d="M122 161 l0 12"/><path d="M136 159 l0 12"/><path d="M150 155 l0 12"/>' +
        '</g>' +
      '</g>';
  }

  function hat(kind) {
    if (kind === 'beanie') {
      return '' +
        '<g class="sm-hat">' +
          '<path d="M74 78 C74 38 96 18 120 18 C144 18 166 38 166 78 Z" fill="url(#smBeanie)"/>' +
          '<g stroke="#9cc4f2" stroke-width="2.2" opacity=".7" stroke-linecap="round">' +
            '<path d="M96 32 l-5 44"/><path d="M120 24 l0 52"/><path d="M144 32 l5 44"/>' +
          '</g>' +
          '<circle cx="120" cy="15" r="13" fill="#e7f1ff"/>' +
          '<circle cx="116" cy="11" r="4.5" fill="#fff" opacity=".9"/>' +
          '<rect x="64" y="62" width="112" height="24" rx="11" fill="#dcebff"/>' +
          '<path d="M70 70 h100" stroke="#a9c8ee" stroke-width="2.6" stroke-linecap="round" opacity=".85"/>' +
          '<path d="M70 78 h100" stroke="#a9c8ee" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>' +
        '</g>';
    }
    if (kind === 'crown') {
      return '' +
        '<g class="sm-hat">' +
          '<path d="M80 78 L86 30 L104 52 L120 20 L136 52 L154 30 L160 78 Z" fill="url(#smGold)" stroke="#e0a71f" stroke-width="2.4" stroke-linejoin="round"/>' +
          '<circle cx="86" cy="34" r="4.5" fill="#fff6d0"/><circle cx="120" cy="26" r="5.5" fill="#ff8fb1"/>' +
          '<circle cx="154" cy="34" r="4.5" fill="#fff6d0"/>' +
          '<circle cx="104" cy="66" r="4" fill="#7fd7ff"/><circle cx="120" cy="70" r="5" fill="#ff8fb1"/><circle cx="136" cy="66" r="4" fill="#7fd7ff"/>' +
          '<path d="M77 74 h86 v9 a5 5 0 0 1 -5 5 h-76 a5 5 0 0 1 -5 -5 z" fill="#ffe08a"/>' +
        '</g>';
    }
    if (kind === 'ribbon') {
      return '' +
        '<g class="sm-hat">' +
          '<path d="M70 62 q50 -20 100 0 l-3 18 q-47 -18 -94 0 z" fill="#fdfdfd"/>' +
          '<g transform="translate(156 44) rotate(12)">' +
            '<path d="M0 2 C-20 -16 -38 -12 -38 2 C-38 16 -20 20 0 6 Z" fill="#ef4d6f"/>' +
            '<path d="M0 2 C20 -16 38 -12 38 2 C38 16 20 20 0 6 Z" fill="#ef4d6f"/>' +
            '<path d="M0 2 C-20 -16 -38 -12 -38 2 C-38 16 -20 20 0 6 Z" fill="#fff" opacity=".22"/>' +
            '<ellipse cx="0" cy="4" rx="8" ry="9" fill="#d63a5c"/>' +
            '<path d="M-13 12 l-9 26 l11 -5 l4 9 l9 -27 z" fill="#ef4d6f"/>' +
          '</g>' +
        '</g>';
    }
    /* santa */
    return '' +
      '<g class="sm-hat">' +
        '<path d="M72 68 C74 42 90 22 112 13 C136 4 160 13 167 34 C171 46 168 56 162 62 L149 57 C155 46 154 34 144 28 C130 19 110 25 99 40 C90 52 86 60 84 68 Z" fill="url(#smRed)"/>' +
        '<path d="M86 40 C96 26 114 20 130 24" stroke="#ff9a9a" stroke-width="3.2" fill="none" stroke-linecap="round" opacity=".5"/>' +
        '<circle cx="172" cy="36" r="12.5" fill="#fdfdfd"/>' +
        '<circle cx="168" cy="32" r="4.4" fill="#fff" opacity=".95"/>' +
        '<rect x="62" y="54" width="116" height="26" rx="13" fill="#fdfdfd"/>' +
        '<path d="M70 67 h100" stroke="#e6ecf7" stroke-width="2.6" stroke-linecap="round"/>' +
      '</g>';
  }

  function face(kind) {
    var cheecks = '<ellipse cx="82" cy="118" rx="10" ry="6.5" fill="#ffb3c1" opacity=".62"/>' +
                  '<ellipse cx="158" cy="118" rx="10" ry="6.5" fill="#ffb3c1" opacity=".62"/>';
    var nose = '<path d="M118 108 L152 117 L119 126 Z" fill="url(#smNose)"/>' +
               '<path d="M122 111 L140 116" stroke="#ffd9a8" stroke-width="2" stroke-linecap="round" opacity=".8"/>';
    if (kind === 'surprise') {
      return cheecks +
        '<g><ellipse cx="101" cy="103" rx="8.5" ry="9.5" fill="#2b3240"/><ellipse cx="139" cy="103" rx="8.5" ry="9.5" fill="#2b3240"/>' +
        '<circle cx="98.5" cy="100" r="2.6" fill="#fff"/><circle cx="136.5" cy="100" r="2.6" fill="#fff"/></g>' +
        '<path d="M92 86 q9 -7 18 -2" stroke="#3a4356" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        '<path d="M130 84 q9 -5 18 2" stroke="#3a4356" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        nose +
        '<ellipse cx="120" cy="141" rx="9" ry="11" fill="#3a2b2b"/>' +
        '<ellipse cx="117" cy="137" rx="3" ry="2.6" fill="#7a5d5d"/>';
    }
    if (kind === 'cool') {
      return cheecks +
        '<g><path d="M88 98 h28 a6 6 0 0 1 6 6 v6 a9 9 0 0 1 -9 9 h-16 a9 9 0 0 1 -9 -9 z" fill="#262c3a"/>' +
        '<path d="M124 98 h28 a6 6 0 0 1 6 6 v6 a9 9 0 0 1 -9 9 h-16 a9 9 0 0 1 -9 -9 z" fill="#262c3a"/>' +
        '<path d="M122 104 h4" stroke="#262c3a" stroke-width="5"/>' +
        '<path d="M92 102 l14 0" stroke="#5d6b86" stroke-width="2.4" opacity=".7" stroke-linecap="round"/>' +
        '<path d="M128 102 l14 0" stroke="#5d6b86" stroke-width="2.4" opacity=".7" stroke-linecap="round"/></g>' +
        nose +
        '<path d="M108 141 q14 11 26 -2" stroke="#3a2b2b" stroke-width="3.4" fill="none" stroke-linecap="round"/>';
    }
    if (kind === 'sleep') {
      return cheecks +
        '<path d="M92 105 q9 9 18 0" stroke="#2b3240" stroke-width="3.6" fill="none" stroke-linecap="round"/>' +
        '<path d="M130 105 q9 9 18 0" stroke="#2b3240" stroke-width="3.6" fill="none" stroke-linecap="round"/>' +
        nose +
        '<ellipse cx="120" cy="140" rx="7" ry="8" fill="#3a2b2b"/>' +
        '<g fill="#9fc9f2" font-family="Pretendard, sans-serif" font-weight="800" font-style="italic">' +
          '<text x="166" y="76" font-size="18">z</text><text x="180" y="58" font-size="23">z</text>' +
        '</g>';
    }
    /* smile */
    return cheecks +
      '<g><circle cx="101" cy="103" r="7.6" fill="#2b3240"/><circle cx="139" cy="103" r="7.6" fill="#2b3240"/>' +
      '<circle cx="98.5" cy="100" r="2.4" fill="#fff"/><circle cx="136.5" cy="100" r="2.4" fill="#fff"/></g>' +
      nose +
      '<g fill="#2b3240">' +
        '<circle cx="104" cy="134" r="2.7"/><circle cx="112" cy="139" r="2.7"/><circle cx="120" cy="141" r="2.7"/>' +
        '<circle cx="128" cy="139" r="2.7"/><circle cx="136" cy="134" r="2.7"/>' +
      '</g>';
  }

  function svg(cfg) {
    cfg = cfg || {};
    var kindHat = HATS.indexOf(cfg.hat) >= 0 ? cfg.hat : 'santa';
    var kindScarf = SCARFS.indexOf(cfg.scarf) >= 0 ? cfg.scarf : 'red';
    var kindFace = FACES.indexOf(cfg.face) >= 0 ? cfg.face : 'smile';
    return '' +
'<svg viewBox="0 0 240 288" xmlns="http://www.w3.org/2000/svg" class="snowman-svg" aria-hidden="true">' +
  '<defs>' +
    '<radialGradient id="smBody" cx="36%" cy="24%" r="78%">' +
      '<stop offset="0" stop-color="#ffffff"/><stop offset=".62" stop-color="#f4f9ff"/><stop offset="1" stop-color="#d9e6f7"/>' +
    '</radialGradient>' +
    '<radialGradient id="smHead" cx="34%" cy="22%" r="80%">' +
      '<stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#f7fbff"/><stop offset="1" stop-color="#dfeaf8"/>' +
    '</radialGradient>' +
    '<linearGradient id="smRed" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#ff6b6b"/><stop offset=".55" stop-color="#e63747"/><stop offset="1" stop-color="#bf1f33"/>' +
    '</linearGradient>' +
    '<linearGradient id="smBeanie" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#8fd0ff"/><stop offset="1" stop-color="#3f8fdd"/>' +
    '</linearGradient>' +
    '<linearGradient id="smGold" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#ffe89a"/><stop offset="1" stop-color="#f3b422"/>' +
    '</linearGradient>' +
    '<linearGradient id="smNose" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#ffa844"/><stop offset="1" stop-color="#f0741b"/>' +
    '</linearGradient>' +
  '</defs>' +
  '<ellipse cx="120" cy="266" rx="76" ry="14" fill="#7fa6cd" opacity=".22"/>' +
  /* 팔(나뭇가지) */
  '<g stroke="#8a5a33" stroke-width="9" stroke-linecap="round" fill="none">' +
    '<path d="M66 186 C42 176 30 158 24 142"/>' +
    '<path d="M24 142 L10 130"/><path d="M24 142 L20 120"/>' +
    '<path d="M174 186 C198 176 210 158 216 142"/>' +
    '<path d="M216 142 L230 130"/><path d="M216 142 L220 120"/>' +
  '</g>' +
  /* 발 */
  '<ellipse cx="88" cy="248" rx="32" ry="19" fill="url(#smHead)"/>' +
  '<ellipse cx="152" cy="248" rx="32" ry="19" fill="url(#smHead)"/>' +
  /* 몸통 */
  '<circle cx="120" cy="198" r="62" fill="url(#smBody)"/>' +
  '<ellipse cx="96" cy="176" rx="20" ry="14" fill="#fff" opacity=".65"/>' +
  /* 단추 */
  '<g fill="#2b3240"><circle cx="108" cy="200" r="6.4"/><circle cx="108" cy="221" r="6.4"/></g>' +
  /* 머리 */
  '<circle cx="120" cy="108" r="49" fill="url(#smHead)"/>' +
  '<ellipse cx="100" cy="86" rx="16" ry="11" fill="#fff" opacity=".8"/>' +
  scarf(kindScarf) +
  face(kindFace) +
  hat(kindHat) +
'</svg>';
  }

  var uriCache = {};
  function dataUri(cfg) {
    var key = [cfg && cfg.hat, cfg && cfg.scarf, cfg && cfg.face].join('|');
    if (!uriCache[key]) {
      uriCache[key] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(cfg));
    }
    return uriCache[key];
  }

  function pick(list, v) { return list.indexOf(v) >= 0 ? v : list[0]; }

  function sanitize(cfg) {
    cfg = cfg || {};
    return { hat: pick(HATS, cfg.hat), scarf: pick(SCARFS, cfg.scarf), face: pick(FACES, cfg.face) };
  }

  return {
    HATS: HATS, SCARFS: SCARFS, FACES: FACES,
    HAT_LABEL: HAT_LABEL, SCARF_LABEL: SCARF_LABEL, FACE_LABEL: FACE_LABEL, FACE_EMOJI: FACE_EMOJI,
    SCARF_COLOR: SCARF_COLOR,
    svg: svg, dataUri: dataUri, sanitize: sanitize
  };
})();
