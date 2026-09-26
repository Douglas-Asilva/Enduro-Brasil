'use strict';
/* Sprites pixel-art dos carros, vistos de trás.
   Cada modelo define só a metade esquerda; a direita é espelhada.
   B carroceria  D carroceria escura  L carroceria clara  K detalhe escuro  G plástico
   S segunda cor  W vidro  w reflexo  T pneu  C cromado  P placa  R/r lanternas */

const MODELS = {
  fusca: {
    half: [
      '......DDBB',
      '....DBBBBB',
      '...DBBWWWW',
      '...DBWwWWW',
      '..DBBBWWWW',
      '..DBBBBBBB',
      '..DBBBBBBL',
      '..DBBBKBKB',
      'rRDBBBKBKB',
      'RRDBBBBBBB',
      'DDDBBBBBPP',
      'DDDDBBBBPP',
      'CCCCCCCCCC',
      '.TTT......',
      '.TTT......',
    ],
  },
  kombi: {
    half: [
      '..SSSSSSSS',
      '.SSSSSSSSS',
      '.SWWWWWWWW',
      '.SWwWWWWWW',
      '.SWWWWWWWW',
      '.SWWWWWWWW',
      '.SSSSSSSSS',
      '.SSSSSSSSS',
      '.BBBBBBBBB',
      '.BBBBBBBBB',
      'RBBKKKKKKK',
      'RBBKBBBBBB',
      'rBBKBBBBPP',
      '.BBKKKKKKK',
      '.DDDDDDDDD',
      'CCCCCCCCCC',
      '.TT.......',
      '.TT.......',
    ],
  },
  // Uno: hatch quadradinho, vidro traseiro grande e quase vertical, lanternas verticais nos cantos
  uno: {
    half: [
      '...DDBBBBB',
      '..DBBBBBBB',
      '..DWWWWWWW',
      '..DWwWWWWW',
      '..DWWWWWWW',
      '..DWWWWWWW',
      '.DBBBBBBBB',
      'RRBBBBBBBB',
      'RrBBBBBBBB',
      'RrBBBBBBPP',
      'RRBBBBBBPP',
      'DDDDDDDDDD',
      'GGGGGGGGGG',
      '.TTT......',
      '.TTT......',
    ],
  },
  brasilia: {
    half: [
      '.....DDBBBB',
      '....DBBBBBB',
      '...DWWWWWWW',
      '..DWwWWWWWW',
      '..DWWWWWWWW',
      '.DBBBBBBBBB',
      'DBBBBBBBBBB',
      'RRRrBBBBBBB',
      'RRRrBBBBBPP',
      'DBBBBBBBBPP',
      'CCCCCCCCCCC',
      '.TTT.......',
      '.TTT.......',
    ],
  },
};

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
// Cache dos textos de cor: o render pede centenas por quadro e quase sempre repete cores
const rgbCache = new Map();
function rgbStr(c) {
  const k = ((c[0] | 0) << 16) | ((c[1] | 0) << 8) | (c[2] | 0);
  let s = rgbCache.get(k);
  if (s === undefined) {
    if (rgbCache.size > 8192) rgbCache.clear();
    s = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
    rgbCache.set(k, s);
  }
  return s;
}
function mulRgb(c, f) { return c.map(v => Math.min(255, v * f)); }
function tintRgb(c, f) { return c.map(v => v + (255 - v) * f); }
function lerpRgb(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }

const spriteCache = new Map();

function getSprite(model, color, mode = 'normal') {
  const key = `${model}|${color}|${mode}`;
  let s = spriteCache.get(key);
  if (!s) {
    s = buildSprite(model, color, mode);
    spriteCache.set(key, s);
  }
  return s;
}

function buildSprite(model, color, mode) {
  const half = MODELS[model].half;
  const hw = Math.max(...half.map(r => r.length));
  const rows = half.map(r => {
    const left = r.padStart(hw, '.');
    return left + left.split('').reverse().join('');
  });
  const cv = document.createElement('canvas');
  cv.width = hw * 2;
  cv.height = rows.length;
  const g = cv.getContext('2d');

  if (mode === 'rim') {
    // Contorno superior: luz de contraluz (dourada)
    g.fillStyle = 'rgb(255,196,110)';
    for (let x = 0; x < cv.width; x++) {
      let y = 0;
      while (y < rows.length && rows[y][x] === '.') y++;
      if (y >= rows.length || rows[y][x] === 'T') continue;
      g.fillRect(x, y, 1, 1);
      if (y < 3 && y + 1 < rows.length && 'BDLS'.includes(rows[y + 1][x])) g.fillRect(x, y + 1, 1, 1);
    }
    cv.lights = [];
    return cv;
  }

  const body = hexToRgb(color);
  const pal = {
    B: body, D: mulRgb(body, 0.65), L: tintRgb(body, 0.35), K: mulRgb(body, 0.4),
    S: [236, 236, 230], W: [27, 39, 51], w: [109, 143, 176], T: [17, 17, 17],
    C: [189, 189, 189], G: [58, 58, 62], P: [230, 207, 58], R: [255, 43, 43], r: [176, 24, 24],
  };

  let lx = 0, ly = 0, ln = 0;
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      let c = pal[ch];
      if (!c) continue;
      const isLight = ch === 'R' || ch === 'r';
      if (isLight && x < hw) { lx += x + 0.5; ly += y + 0.5; ln++; }
      if (mode === 'lights') {
        if (!isLight) continue;
        c = [255, 59, 59];
      } else if (mode === 'solid') {
        c = body;                   // silhueta chapada na cor dada (ex.: neblina)
      } else if (mode === 'night' && !isLight) {
        c = mulRgb(c, 0.22);
      }
      g.fillStyle = rgbStr(c);
      g.fillRect(x, y, 1, 1);
    }
  }
  // Centro das lanternas (esquerda e direita), em pixels do sprite
  lx /= ln; ly /= ln;
  cv.lights = [[lx, ly], [cv.width - lx, ly]];
  return cv;
}

/* ================= Objetos da beira da estrada =================
   Mesma ideia dos carros: `half` é espelhado (objetos simétricos); `rows` é a imagem inteira.
   anchor: coluna (em pixels) que toca o chão na posição do objeto; size: escala extra. */
const PROP_PAL = {
  G: [52, 128, 56], H: [30, 88, 38], E: [110, 180, 100],            // folhagem
  N: [110, 76, 50], M: [76, 50, 34],                                 // tronco / madeira
  Q: [70, 72, 80], P: [140, 142, 150],                               // poste
  L: [230, 230, 210],                                                // lâmpada (acesa à noite)
  V: [235, 235, 235], S: [0, 112, 60], W: [250, 250, 250],           // placa verde / branco
  K: [40, 40, 46], R: [200, 50, 40], Y: [245, 200, 40],              // outdoor / telhado
  B: [150, 156, 170], D: [96, 102, 116], J: [120, 150, 180], O: [70, 88, 108], // prédio: parede, aresta, vidro, vidro escuro
  // Casas do morro: fachadas coloridas, tijolo aparente e caixa d'água azul
  a: [232, 122, 58], b: [236, 132, 164], c: [246, 206, 82], d: [112, 172, 222], e: [124, 192, 122],
  f: [168, 88, 58], F: [132, 66, 44], x: [38, 108, 192],
  // Sertão: cactos, caatinga seca, casa de taipa, arame da cerca
  C: [96, 164, 84], g: [58, 116, 64], u: [222, 232, 176],           // cacto: claro, escuro, espinhos
  i: [150, 150, 72], j: [112, 108, 52],                              // folhas secas
  T: [214, 172, 122], t: [182, 138, 92], A: [196, 98, 58], r: [206, 206, 196],   // taipa, sombra, telha de barro, arame
  // Animais (cada variante troca U/I/Z): corpo, sombra/pernas do outro lado, manchas/crina
  U: [240, 236, 228], I: [196, 192, 184], Z: [34, 30, 30],
  p: [224, 150, 142], h: [232, 218, 176], k: [24, 20, 20], z: [24, 16, 8],   // focinho, chifre, casco, olho
};
// O que acende à noite (o olho dos animais brilha no escuro)
const PROP_NIGHT_LIGHT = { L: [255, 236, 160], J: [255, 214, 120], z: [255, 244, 120] };

const TREE_HALF = [
  '.....HHH', '...HHGGG', '..HGGGEG', '.HGGGEEG', '.HGGGGGG', 'HGGGGGGE', 'HGGEGGGG', 'HGGGGGGG',
  'HHGGGGGG', '.HGGGGEG', '.HHGGGGG', '..HHHGGG', '....HHHH', '......MN', '......MN', '......MN',
  '......MN', '.....MMN',
];
const BILLBOARD_ROWS = [
  'KKKKKKKKKKKKKKKKKKKKKKKK',
  'KRRRRRRRRRRRRRRRRRRRRRRK',
  'KRYYYYYRRRRRRRWWWWWWWRRK',
  'KRYYYYYRRRWWRRWRRRRRWRRK',
  'KRYYYYYRRRWWRRWWWWWWWRRK',
  'KRRRRRRRRRRRRRRRRRRRRRRK',
  'KRWWWWWWWWWWWWWWWWWWWWRK',
  'KRRRRRRRRRRRRRRRRRRRRRRK',
  'KKKKKKKKKKKKKKKKKKKKKKKK',
  ...Array(8).fill('....QP............QP....'),
];

// Prédio com grade de janelas (algumas acesas à noite)
function makeBuilding(w, h, seed) {
  const rows = [];
  for (let y = 0; y < h; y++) {
    let r = '';
    for (let x = 0; x < w; x++) {
      if (x === 0 || x === w - 1 || y === 0) r += 'D';
      else if (y >= 2 && y < h - 2 && x % 3 !== 0 && (y - 2) % 4 < 2) {
        const s = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.7) * 43758.5453;
        r += s - Math.floor(s) < 0.4 ? 'J' : 'O';
      } else r += 'B';
    }
    rows.push(r);
  }
  return rows;
}

// Casas empilhadas de morro: 2 a 4 andares de larguras e cores diferentes, com laje,
// janelas (acesas à noite), porta no térreo e caixa d'água azul em cima
function makeHillHouses(seed) {
  let s = seed;
  const rnd = n => { s = (s * 9301 + 49297) % 233280; return s % n; };
  const WIDTH = 24, floors = [];
  const n = 2 + rnd(3);
  for (let i = 0; i < n; i++) {
    const w = 12 + rnd(WIDTH - 11);
    floors.push({ w, o: rnd(WIDTH - w + 1), wall: 'abcdeff'[rnd(7)] });   // tijolo aparente aparece mais
  }
  const rows = [];
  floors.forEach((fl, i) => {
    const line = (fill) => ('.'.repeat(fl.o) + fill + '.'.repeat(WIDTH)).slice(0, WIDTH);
    // Cada andar entra acima dos anteriores (linhas de cima para baixo: laje e 4 de parede)
    rows.unshift(...[
      line('D'.repeat(fl.w)),                                         // laje
      ...[0, 1, 2, 3].map(r => {
        let wall = '';
        for (let x = 0; x < fl.w; x++) {
          const brick = fl.wall === 'f' && (x + r * 2) % 4 === 0 ? 'F' : fl.wall;
          const win = x > 1 && x < fl.w - 2 && x % 5 < 2 && (r === 1 || r === 2);
          const door = i === 0 && x >= 2 && x <= 3 && r >= 1;
          wall += door ? 'K' : win ? ((x * 7 + r + seed + i) % 3 ? 'J' : 'O') : brick;
        }
        return line(wall);
      }),
    ]);
  });
  // Caixa d'água no andar de cima
  const top = floors[floors.length - 1], tx = top.o + 1 + rnd(Math.max(1, top.w - 6));
  const tank = r => ('.'.repeat(tx) + r + '.'.repeat(WIDTH)).slice(0, WIDTH);
  rows.unshift(tank('.xxxx.'), tank('xxxxxx'), tank('xxxxxx'), tank('.PPPP.'));
  return rows;
}

// Grade para desenhar sprites por formas (retângulos e elipses) em vez de digitar cada linha
function gridOf(w, h) {
  const g = Array.from({ length: h }, () => Array(w).fill('.'));
  const px = (x, y, c) => { if (x >= 0 && x < w && y >= 0 && y < h) g[y][x] = c; };
  const rect = (x, y, rw, rh, c) => { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) px(x + i, y + j, c); };
  const oval = (cx, cy, rx, ry, c) => {
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx + 0.5) + (y * y) / (ry * ry + 0.5) <= 1) px(cx + x, cy + y, c);
  };
  return { px, rect, oval, rows: () => g.map(r => r.join('')) };
}

// Vaca de perfil (olhando para a direita), com cupim de zebu. U corpo, I sombra, Z manchas/rabo, p focinho
function makeCow(frame) {
  const s = gridOf(27, 17);
  s.rect(3, 5, 1, 4, 'U'); s.rect(4, 4, 14, 7, 'U');
  s.rect(13, 3, 4, 1, 'U'); s.rect(14, 2, 2, 1, 'U');                  // cupim
  s.rect(4, 10, 14, 1, 'I');                                            // barriga
  s.rect(6, 5, 3, 3, 'Z'); s.rect(11, 6, 3, 3, 'Z'); s.rect(15, 4, 2, 2, 'Z');
  s.rect(17, 5, 3, 4, 'U'); s.rect(19, 5, 5, 5, 'U');                   // pescoço e cabeça
  s.rect(23, 8, 3, 2, 'p'); s.px(22, 6, 'z');
  s.rect(18, 5, 2, 1, 'I'); s.px(20, 4, 'h'); s.px(21, 3, 'h');         // orelha e chifre
  s.rect(2, 5, 1, 6, 'Z'); s.rect(1, 10, 2, 2, 'Z');                    // rabo
  s.rect(8, 11, 3, 1, 'p');                                             // úbere
  // Pernas: no quadro 1 as pernas de cada par se cruzam
  const legs = frame ? [[6, 'U'], [7, 'I'], [15, 'I'], [14, 'U']] : [[4, 'U'], [9, 'I'], [13, 'I'], [16, 'U']];
  for (const [x, c] of legs) { s.rect(x, 11, 2, 5, c); s.rect(x, 16, 2, 1, 'k'); }
  return s.rows();
}

// Cavalo de perfil (olhando para a direita): pescoço arqueado, crina e rabo compridos
function makeHorse(frame) {
  const s = gridOf(32, 25);
  s.rect(6, 10, 1, 4, 'U'); s.rect(7, 9, 15, 7, 'U'); s.rect(8, 15, 13, 1, 'I');
  s.rect(20, 7, 3, 5, 'U'); s.rect(22, 4, 3, 5, 'U'); s.rect(23, 2, 3, 3, 'U');   // pescoço
  s.rect(24, 2, 4, 4, 'U'); s.rect(27, 5, 3, 4, 'U');                              // cabeça e focinho
  s.rect(28, 8, 2, 1, 'p'); s.px(26, 3, 'z'); s.rect(24, 0, 1, 2, 'U');            // focinho, olho, orelha
  s.rect(19, 6, 1, 4, 'Z'); s.rect(21, 3, 1, 4, 'Z'); s.rect(22, 1, 1, 3, 'Z'); s.px(25, 1, 'Z');   // crina
  s.rect(4, 9, 2, 3, 'Z'); s.rect(3, 12, 2, 5, 'Z'); s.rect(2, 17, 2, 3, 'Z');     // rabo
  const legs = frame ? [[10, 'U'], [8, 'I'], [18, 'I'], [20, 'U']] : [[8, 'U'], [11, 'I'], [17, 'I'], [21, 'U']];
  for (const [x, c] of legs) { s.rect(x, 16, 2, 8, c); s.rect(x, 24, 2, 1, 'k'); }
  return s.rows();
}

// Mandacaru: tronco com dois braços que sobem
function makeMandacaru() {
  const s = gridOf(15, 28);
  s.rect(6, 1, 3, 27, 'C'); s.rect(8, 1, 1, 27, 'g'); s.rect(6, 0, 3, 1, 'C');
  s.rect(1, 12, 3, 8, 'C'); s.rect(3, 12, 1, 8, 'g'); s.rect(1, 11, 3, 1, 'C');     // braço esquerdo
  s.rect(1, 19, 6, 3, 'C'); s.rect(1, 21, 6, 1, 'g');
  s.rect(11, 6, 3, 9, 'C'); s.rect(13, 6, 1, 9, 'g'); s.rect(11, 5, 3, 1, 'C');      // braço direito
  s.rect(9, 14, 5, 3, 'C'); s.rect(9, 16, 5, 1, 'g');
  for (const [x, y] of [[7, 4], [7, 9], [7, 15], [7, 21], [2, 14], [12, 8], [12, 11]]) s.px(x, y, 'u');   // espinhos
  return s.rows();
}

// Palma / xique-xique: raquetes empilhadas
function makePalma() {
  const s = gridOf(16, 16);
  s.oval(7, 12, 5, 3, 'C'); s.oval(4, 8, 3, 3, 'C'); s.oval(10, 7, 3, 3, 'C'); s.oval(8, 3, 3, 2, 'C');
  s.rect(3, 14, 10, 2, 'g');
  for (const [x, y] of [[4, 8], [10, 7], [8, 3], [5, 12], [9, 12], [12, 12], [7, 14]]) s.px(x, y, 'u');
  return s.rows();
}

// Árvore da caatinga: tronco retorcido e copa rala e achatada, de folhas secas
function makeCaatinga(seed) {
  const s = gridOf(26, 26);
  const rnd = k => { const v = Math.sin(k * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  s.rect(11, 12, 3, 14, 'N'); s.rect(13, 12, 1, 14, 'M'); s.rect(10, 24, 5, 2, 'N');
  s.rect(6, 9, 6, 2, 'M'); s.rect(13, 8, 7, 2, 'M'); s.rect(4, 6, 3, 4, 'M'); s.rect(19, 5, 3, 4, 'M');   // galhos
  for (let y = 0; y < 14; y++) {
    for (let x = 0; x < 26; x++) {
      const inCrown = ((x - 13) * (x - 13)) / 170 + ((y - 6) * (y - 6)) / 42 < 1;
      const r = rnd(x * 3.3 + y * 9.1 + seed * 17);
      if (inCrown && r < 0.45) s.px(x, y, r < 0.2 ? 'j' : 'i');
    }
  }
  return s.rows();
}

// Casinha de taipa com telhado de barro, porta de madeira e janela
function makeTaipa() {
  const s = gridOf(26, 16);
  s.rect(6, 0, 14, 1, 'A'); s.rect(3, 1, 20, 1, 'A'); s.rect(1, 2, 24, 1, 'A'); s.rect(0, 3, 26, 2, 'A');
  s.rect(0, 4, 26, 1, 'F');
  s.rect(2, 5, 22, 10, 'T'); s.rect(2, 14, 22, 2, 't');
  s.rect(4, 8, 5, 8, 'M'); s.rect(5, 9, 3, 6, 'N');                          // porta
  s.rect(15, 8, 5, 4, 'K'); s.rect(16, 9, 3, 2, 'O');                        // janela
  for (let x = 2; x < 24; x += 3) s.px(x, 6 + (x % 2), 't');                 // reboco descascado
  return s.rows();
}

// Placa amarela de "animais na pista"
function makePlacaGado() {
  const s = gridOf(17, 26);
  for (let dy = -7; dy <= 7; dy++) {
    const half = 8 - Math.abs(dy);
    s.rect(8 - half, 8 + dy, half * 2 + 1, 1, 'K');
    if (half > 1) s.rect(9 - half, 8 + dy, half * 2 - 1, 1, 'Y');
  }
  s.rect(5, 7, 7, 3, 'K'); s.rect(11, 6, 2, 2, 'K'); s.rect(5, 10, 1, 2, 'K'); s.rect(7, 10, 1, 2, 'K');
  s.rect(9, 10, 1, 2, 'K'); s.rect(11, 10, 1, 2, 'K');                       // vaca
  s.rect(7, 16, 3, 10, 'P'); s.rect(9, 16, 1, 10, 'Q');
  return s.rows();
}

// Estaca da cerca de arame
function makeEstaca() {
  const s = gridOf(11, 14);
  s.rect(4, 0, 3, 14, 'N'); s.rect(6, 0, 1, 14, 'M');
  s.rect(0, 2, 11, 1, 'r'); s.rect(0, 6, 11, 1, 'r'); s.rect(0, 10, 11, 1, 'r');
  return s.rows();
}

// Cata-vento de puxar água
function makeCataVento() {
  const s = gridOf(19, 34);
  const cx = 9, cy = 6;
  for (let i = -6; i <= 6; i++) { s.px(cx + i, cy + i, 'P'); s.px(cx + i, cy - i, 'P'); }
  s.rect(cx - 1, cy - 1, 3, 3, 'Q');
  s.rect(cx + 6, cy - 1, 4, 2, 'P');                                          // leme
  for (let y = 9; y < 34; y++) {                                              // torre em treliça
    const half = 1 + Math.floor((y - 9) / 6);
    s.px(cx - half, y, 'Q'); s.px(cx + half, y, 'Q');
    if ((y - 9) % 6 === 0) s.rect(cx - half, y, half * 2 + 1, 1, 'P');
  }
  return s.rows();
}

// ---- Transamazônica: floresta, placa da BR, palafita e caminhão atolado ----
function makeCastanheira() {
  const s = gridOf(34, 46);
  s.rect(15, 20, 4, 26, 'N'); s.rect(18, 20, 1, 26, 'M'); s.rect(13, 42, 8, 4, 'N'); s.rect(13, 45, 8, 1, 'M');
  s.oval(17, 9, 12, 8, 'H'); s.oval(9, 13, 8, 6, 'G'); s.oval(25, 13, 8, 6, 'G'); s.oval(17, 8, 9, 6, 'G');
  s.oval(14, 6, 4, 3, 'E'); s.oval(24, 9, 3, 2, 'E'); s.oval(17, 15, 11, 2, 'H');
  for (const [x, len] of [[8, 8], [12, 6], [22, 9], [27, 7], [18, 5]]) s.rect(x, 16, 1, len, 'g');   // cipós
  return s.rows();
}

// Palmeira (açaí): tronco fino e curvo com folhas em leque
function makePalmeira() {
  const s = gridOf(26, 40);
  for (let y = 11; y < 40; y++) { const x = 12 + Math.round(Math.sin((40 - y) / 11) * 2); s.rect(x, y, 2, 1, 'N'); s.px(x + 1, y, 'M'); }
  const dirs = [[-1, 0.2], [-0.85, -0.25], [-0.45, -0.65], [0, -0.9], [0.45, -0.65], [0.85, -0.25], [1, 0.2]];
  for (const [dx, dy] of dirs) {
    for (let t = 0; t <= 11; t++) {
      const x = Math.round(12 + dx * t), y = Math.round(10 + dy * t + t * t * 0.045 * Math.abs(dx));
      s.px(x, y, t % 3 === 0 ? 'E' : 'G'); s.px(x, y + 1, 'H');
    }
  }
  s.rect(11, 9, 3, 3, 'H');
  return s.rows();
}

// Samambaia: touceira baixa de folhas em leque
function makeSamambaia() {
  const s = gridOf(20, 11);
  for (const dx of [-1, -0.7, -0.35, 0, 0.35, 0.7, 1]) {
    for (let t = 0; t <= 9; t++) {
      const x = Math.round(10 + dx * t), y = Math.round(10 - t * (1 - Math.abs(dx) * 0.55) + t * t * 0.03 * Math.abs(dx));
      s.px(x, y, t % 2 ? 'G' : 'E'); if (t > 2) s.px(x, y + 1, 'H');
    }
  }
  s.rect(9, 9, 2, 2, 'H');
  return s.rows();
}

// Escudo da BR
function makePlacaBR() {
  const s = gridOf(16, 30);
  s.rect(2, 0, 12, 14, 'K'); s.rect(3, 1, 10, 12, 'W'); s.rect(4, 14, 8, 1, 'K'); s.rect(6, 15, 4, 1, 'K'); s.rect(4, 13, 8, 1, 'W');
  const B = ['KK.', 'K.K', 'KK.', 'K.K', 'KK.'], R = ['KK.', 'K.K', 'KK.', 'KK.', 'K.K'];
  B.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'K') s.px(4 + x, 4 + y, 'K'); }));
  R.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'K') s.px(9 + x, 4 + y, 'K'); }));
  s.rect(7, 16, 2, 14, 'P'); s.rect(8, 16, 1, 14, 'Q');
  return s.rows();
}

// Casa de madeira sobre palafitas, com telhado de palha
function makePalafita() {
  const s = gridOf(30, 28);
  for (const x of [4, 12, 24]) s.rect(x, 18, 2, 10, 'M');
  s.rect(2, 17, 26, 2, 'N');
  s.rect(4, 9, 22, 8, 'N');
  for (let x = 4; x < 26; x += 3) s.rect(x, 9, 1, 8, 'M');
  s.rect(12, 11, 5, 6, 'K'); s.rect(20, 11, 4, 3, 'K');
  for (let y = 0; y < 9; y++) { const half = Math.min(15, 2 + Math.round(y * 1.7)); s.rect(15 - half, y, half * 2, 1, y % 2 ? 'T' : 't'); }
  return s.rows();
}

// Caminhão atolado na lama, visto de trás
function makeCaminhao() {
  const s = gridOf(32, 26);
  s.rect(3, 2, 26, 17, 'A');
  for (let x = 8; x < 29; x += 6) s.rect(x, 2, 1, 17, 'F');
  s.rect(3, 2, 26, 1, 'F'); s.rect(3, 18, 26, 1, 'F');
  s.rect(3, 19, 26, 2, 'K'); s.rect(3, 16, 2, 2, 'R'); s.rect(27, 16, 2, 2, 'R');
  s.rect(5, 20, 5, 5, 'k'); s.rect(22, 20, 5, 5, 'k');
  s.rect(0, 23, 32, 3, 'F'); s.rect(2, 22, 6, 1, 'F'); s.rect(24, 22, 6, 1, 'F');
  return s.rows();
}

// Vaca e cavalo em três pelagens, dois quadros de caminhada cada (nome: vacaA0, cavaloB1...)
const COW_COATS = {
  A: { U: [240, 236, 228], I: [196, 192, 184], Z: [34, 30, 30] },           // branca malhada
  B: { U: [150, 92, 52], I: [112, 68, 38], Z: [82, 50, 28] },               // marrom
  C: { U: [226, 220, 208], I: [186, 178, 164], Z: [120, 112, 100] },        // nelore
};
const HORSE_COATS = {
  A: { U: [160, 90, 44], I: [122, 66, 32], Z: [60, 34, 20] },               // alazão
  B: { U: [52, 48, 52], I: [34, 32, 36], Z: [20, 18, 20] },                 // preto
  C: { U: [226, 224, 220], I: [186, 184, 182], Z: [140, 136, 130] },        // tordilho
};
const ANIMALS = {};
for (const f of [0, 1]) {
  for (const v of Object.keys(COW_COATS)) ANIMALS[`vaca${v}${f}`] = { rows: makeCow(f), pal: COW_COATS[v], size: 1.15 };
  for (const v of Object.keys(HORSE_COATS)) ANIMALS[`cavalo${v}${f}`] = { rows: makeHorse(f), pal: HORSE_COATS[v], size: 1.1 };
}

const PROPS = {
  ...ANIMALS,
  mandacaru: { rows: makeMandacaru(), size: 1.3 },
  palma: { rows: makePalma(), size: 1.1 },
  arvoreSeca: { rows: makeCaatinga(1), size: 1.4 },
  arvoreSeca2: { rows: makeCaatinga(2), size: 1.3 },
  casaTaipa: { rows: makeTaipa(), size: 1.3 },
  placaGado: { rows: makePlacaGado(), size: 1.1 },
  estaca: { rows: makeEstaca(), size: 1 },
  cataVento: { rows: makeCataVento(), size: 1.5 },
  castanheira: { rows: makeCastanheira(), size: 1.8 },
  palmeira: { rows: makePalmeira(), size: 1.6 },
  samambaia: { rows: makeSamambaia(), size: 1.2 },
  placaBR: { rows: makePlacaBR(), size: 1.1 },
  casaPalafita: { rows: makePalafita(), size: 1.3 },
  caminhaoAtolado: { rows: makeCaminhao(), size: 1.3 },
  arvore: { half: TREE_HALF },
  ipe: { half: TREE_HALF, pal: { G: [240, 196, 30], H: [190, 140, 10], E: [255, 236, 130] } },
  ipeRoxo: { half: TREE_HALF, pal: { G: [190, 90, 170], H: [130, 50, 120], E: [235, 160, 220] } },
  coqueiro: {
    rows: [
      '...GG....HH.....', '..G..GG.H..HH...', '.G....GGHH...H..', 'G....HGGGGH...H.',
      '....H..GGE.G....', '...H..MNNM..G...', '.......NM.......', '.......NM.......',
      '........NM......', '........NM......', '........NM......', '........NM......',
      '.........NM.....', '.........NM.....', '.........NM.....', '.........NM.....',
      '........MNNM....',
    ],
    anchor: 10, size: 1.3,
  },
  // Poste de luz: haste do lado de fora, braço e lâmpada sobre a pista
  poste: {
    rows: ['.QPPPPPPPPQ', '.PQ.....LLL', '.PQ......L.', ...Array(20).fill('.PQ........'), 'QPPQ.......'],
    anchor: 2, size: 1.2,
  },
  placa: {
    rows: [
      'VVVVVVVVVVVVVVVV', 'VSSSSSSSSSSSSSSV', 'VSSWSWSWSSSWSSSV', 'VSSWWSSWWSWWSSSV',
      'VSSWSSSWSWSWSSSV', 'VSSWWSSWSSSWSSSV', 'VSSWSWSWSSSWSSSV', 'VSSSSSSSSSSSSSSV',
      'VVVVVVVVVVVVVVVV', ...Array(6).fill('...QP......QP...'),
    ],
  },
  outdoor: { rows: BILLBOARD_ROWS, size: 1.3 },
  outdoorAzul: { rows: BILLBOARD_ROWS, pal: { R: [40, 90, 200], Y: [250, 250, 250], W: [245, 200, 40] }, size: 1.3 },
  casa: {
    rows: [
      '.......RRRRRR.......', '.....RRRRRRRRRR.....', '...RRRRRRRRRRRRRR...', '.RRRRRRRRRRRRRRRRRR.',
      'RRRRRRRRRRRRRRRRRRRR', '.VVVVVVVVVVVVVVVVVV.', '.VVOOVVVVVVVVVOOVVV.', '.VVOOVVVNNVVVVJJVVV.',
      '.VVVVVVVNNVVVVJJVVV.', '.VVVVVVVNNVVVVVVVVV.', '.DDDDDDDDDDDDDDDDDD.',
    ],
    size: 1.2,
  },
  casaMorro1: { rows: makeHillHouses(11), size: 1.4 },
  casaMorro2: { rows: makeHillHouses(29), size: 1.4 },
  casaMorro3: { rows: makeHillHouses(47), size: 1.4 },
  casaMorro4: { rows: makeHillHouses(83), size: 1.4 },
  // Poste com o emaranhado de fios e o transformador
  posteFios: {
    rows: [
      '.....PPP.....', 'KKKKKKPKKKKKK', '.K.K.KPK.K.K.', '..KKKKPKKKK..', '...KK.P.KK...',
      '.....BPB.....', '.....BPB.....', '.....KPK.....', ...Array(15).fill('......P......'), '.....QPQ.....',
    ],
    size: 1.3,
  },
  // Orelhão
  orelhao: {
    rows: [
      '..aaaaa..', '.aaaaaaa.', 'aaKKKKKaa', 'aaK...Kaa', 'aa.....aa', 'a.......a',
      '....P....', '....P....', '....P....', '...PPP...',
    ],
    size: 1.1,
  },
  predio1: { rows: makeBuilding(18, 40, 1), size: 1.6 },
  predio2: { rows: makeBuilding(22, 30, 2), pal: { B: [178, 150, 120], D: [120, 98, 78] }, size: 1.6 },
  predio3: { rows: makeBuilding(15, 46, 3), pal: { B: [110, 118, 128], D: [70, 76, 86] }, size: 1.6 },
};

const propCache = new Map();
function getProp(name, mode = 'normal', flip = false, color = '') {
  const key = `${name}|${mode}|${flip}|${color}`;
  let s = propCache.get(key);
  if (!s) {
    s = buildProp(name, mode, flip, color);
    propCache.set(key, s);
  }
  return s;
}

function buildProp(name, mode, flip, color) {
  const def = PROPS[name];
  let rows = def.rows || def.half.map(r => r + r.split('').reverse().join(''));
  const w = Math.max(...rows.map(r => r.length));
  rows = rows.map(r => r.padEnd(w, '.'));
  if (flip) rows = rows.map(r => r.split('').reverse().join(''));
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = rows.length;
  const g = cv.getContext('2d');
  const pal = def.pal ? { ...PROP_PAL, ...def.pal } : PROP_PAL;
  const anchor = def.anchor !== undefined ? def.anchor : w / 2;
  cv.anchor = flip ? w - anchor : anchor;
  cv.size = def.size || 1;

  let lx = 0, ly = 0, ln = 0;
  const solid = mode === 'solid' ? hexToRgb(color) : null;
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      let c = pal[ch];
      if (!c) continue;
      const light = PROP_NIGHT_LIGHT[ch];
      if (ch === 'L') { lx += x + 0.5; ly += y + 0.5; ln++; }
      if (solid) c = solid;
      else if (mode === 'night') c = light || mulRgb(c, 0.16);
      g.fillStyle = rgbStr(c);
      g.fillRect(x, y, 1, 1);
    }
  }
  cv.lamp = ln ? [lx / ln, ly / ln] : null;      // posição da lâmpada (postes)
  return cv;
}

/* Textura de brilho radial, desenhada com composição aditiva ('lighter'). */
function makeGlow(r, g, b) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 32;
  const c = cv.getContext('2d');
  const gr = c.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, `rgba(${r},${g},${b},1)`);
  gr.addColorStop(0.2, `rgba(${r},${g},${b},0.55)`);
  gr.addColorStop(0.55, `rgba(${r},${g},${b},0.15)`);
  gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
  c.fillStyle = gr;
  c.fillRect(0, 0, 32, 32);
  return cv;
}
const GLOW_RED = makeGlow(255, 50, 35);
const GLOW_WARM = makeGlow(255, 225, 160);
