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

  if (mode === 'snowcap' || mode === 'rim') {
    // Contorno superior: neve acumulada (branca) ou luz de contraluz (dourada)
    g.fillStyle = mode === 'rim' ? 'rgb(255,196,110)' : 'rgb(246,249,255)';
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
};
const PROP_NIGHT_LIGHT = { L: [255, 236, 160], J: [255, 214, 120] };   // o que acende à noite

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

const PROPS = {
  arvore: { half: TREE_HALF },
  ipe: { half: TREE_HALF, pal: { G: [240, 196, 30], H: [190, 140, 10], E: [255, 236, 130] } },
  ipeRoxo: { half: TREE_HALF, pal: { G: [190, 90, 170], H: [130, 50, 120], E: [235, 160, 220] } },
  araucaria: {
    half: [
      '..HHHGGGGG', 'HHGGGGEGGG', '.HHHHGGGGG', '......HHMN', '........MN', '....HHGGMN', '..HHH...MN',
      '........MN', '........MN', '........MN', '........MN', '........MN', '........MN', '........MN',
      '.......MMN',
    ],
    size: 1.3,
  },
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

  if (mode === 'snowcap') {
    g.fillStyle = 'rgb(246,249,255)';
    for (let x = 0; x < w; x++) {
      let y = 0;
      while (y < rows.length && rows[y][x] === '.') y++;
      if (y >= rows.length) continue;
      g.fillRect(x, y, 1, 1);
      if (y + 1 < rows.length && 'GHE'.includes(rows[y + 1][x])) g.fillRect(x, y + 1, 1, 1);
    }
    return cv;
  }

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
