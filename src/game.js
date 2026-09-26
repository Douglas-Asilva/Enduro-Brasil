'use strict';
/* Enduro Remaster — Edição Brasileira
   Corrida inspirada no Enduro (Activision, Atari 2600). */

// ================= Tela =================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const W = 320, H = 240;
const VIEW_H = 200;                 // área da pista; abaixo fica o painel
const HORIZON = 84;
const ROAD_ROWS = VIEW_H - HORIZON;
const ROAD_HALF = 118;              // meia-largura da pista na base da tela (px)
const CAM_D = 100;                  // distância câmera → base da tela (unidades de mundo)
const CURVE_AMP = 120;
const PLAYER_Y = 194;               // base do sprite do jogador
const P_PLAYER = (PLAYER_Y - HORIZON) / ROAD_ROWS;
const D_PLAYER = CAM_D / P_PLAYER;
const HALF_P = ROAD_HALF * P_PLAYER;
const PLAYER_SCALE = 2;
const FONT = '"Press Start 2P", monospace';

// ================= Regras =================
const KMH = 5;                      // unidades de mundo por segundo, por km/h
const STRIPE = 30;
const LANES = [-0.62, 0, 0.62];
const CAR_LEN = 20;
const SPAWN_DIST = 1700;
const OFFROAD_X = 0.95;
// Meta de ultrapassagens do 1º dia (escolhida no menu); os dias seguintes exigem +1/3 cada, até 2,5x
const GOAL_OPTIONS = [30, 60, 90, 120, 150, 200, 250, 300];
const DEFAULT_GOAL = 120;
const goalBase = () => GOAL_OPTIONS[G.goalIdx];
const dayGoal = day => {
  const base = goalBase();
  return Math.min(Math.round(base * 2.5), base + (day - 1) * Math.ceil(base / 3));
};

const CARS = [
  { id: 'fusca', name: 'FUSCA', color: '#c8262b', desc: 'EQUILIBRADO E VALENTE',
    topKmh: 130, accel: 1.0, handling: 1.0, mass: 1.0, retain: 0.30, pitch: 1.0 },
  { id: 'kombi', name: 'KOMBI', color: '#2a5bd7', desc: 'LENTA, MAS FIRME NA LAMA',
    topKmh: 110, accel: 0.72, handling: 0.75, mass: 1.6, retain: 0.55, pitch: 0.8 },
  { id: 'brasilia', name: 'BRASÍLIA', color: '#f2c21b', desc: 'A MAIS VELOZ, PORÉM ARISCA',
    topKmh: 150, accel: 1.15, handling: 0.85, mass: 0.9, retain: 0.25, pitch: 1.15 },
  { id: 'uno', name: 'UNO', color: '#ecebe4', desc: 'ÁGIL E ESPERTO, MAS FRÁGIL',
    topKmh: 128, accel: 1.2, handling: 1.15, mass: 0.75, retain: 0.22, pitch: 1.3 },
];
const OPP_MODELS = CARS.map(c => c.id);
const OPP_COLORS = ['#d03a2a', '#3a6ad8', '#e8c030', '#2fa04a', '#e8e8e8',
                    '#8a4fbf', '#e07a20', '#3cc0c0', '#b08a60', '#5a5a5a'];

// ================= Fases do dia =================
// sun: posição horizontal (0..1) e elevação no início/fim da fase (1 = alto, <0 = abaixo do horizonte)
// blend: segundos de transição para a fase seguinte; cloud: quantidade de nuvens; mist: neblina baixa
// Chuva: 2ª fase do dia (nas paisagens secas, DRY_PHASE ocupa o lugar dela — mesma duração)
const RAIN_PHASE = {
  name: 'CHUVA', dur: 25, skyT: '#3a414c', skyM: '#555d69', skyB: '#737b86', g1: '#2f5a34', g2: '#2b532f', road: '#3e4146',
  e1: '#d8d8d8', e2: '#b03a3a', m1: '#3c4a4a', m2: '#56606a', cl: '#6a727c', cs: '#454c56',
  night: 0, fog: 0, mist: 0, rain: 1, cloud: 1,
};
const PHASES = [
  { name: 'DIA', dur: 40, sun: { x: 0.34, e0: 0.9, e1: 1.8 }, skyT: '#3f7fe0', skyM: '#6aa2f0', skyB: '#8fc0ff', g1: '#2f8f2f', g2: '#2a822a', road: '#6f6f6f',
    e1: '#ffffff', e2: '#d83a3a', m1: '#2e6a3a', m2: '#5f8fb0', cl: '#ffffff', cs: '#c8d8f0',
    night: 0, fog: 0, mist: 0, cloud: 0.5 },
  RAIN_PHASE,
  { name: 'ENTARDECER', dur: 30, blend: 10, sun: { x: 0.64, e0: 0.95, e1: -0.2 },
    skyT: '#2c1850', skyM: '#b8386a', skyB: '#ffb040', g1: '#5f6a20', g2: '#57611c', road: '#5b4f4a',
    e1: '#ffe0b0', e2: '#c04020', m1: '#3a1834', m2: '#7a2c4c', cl: '#ffd070', cs: '#8a3060',
    night: 0, fog: 0, mist: 0, cloud: 1 },
  { name: 'NOITE', dur: 35, blend: 10, skyT: '#000008', skyM: '#02020f', skyB: '#05051a', g1: '#050805', g2: '#030503', road: '#0c0c0c',
    e1: '#7a7a7a', e2: '#505050', m1: '#0a0a16', m2: '#10102a', cl: '#1a1a2a', cs: '#0a0a14',
    night: 1, fog: 0, mist: 0, cloud: 0 },
  { name: 'NEBLINA', dur: 20, skyT: '#8c8f94', skyM: '#9a9da2', skyB: '#a8abb0', g1: '#5f6f5f', g2: '#5a695a', road: '#6a6a6a',
    e1: '#d0d0d0', e2: '#a0a0a0', m1: '#9a9da2', m2: '#a3a6ab', cl: '#b0b3b8', cs: '#9a9da2',
    night: 0, fog: 1, mist: 0, cloud: 0 },
  { name: 'AMANHECER', dur: 30, sun: { x: 0.34, e0: -0.2, e1: 0.9 },
    skyT: '#34509a', skyM: '#d88ab0', skyB: '#ffd2a0', g1: '#3a7a44', g2: '#34703e', road: '#6a6670',
    e1: '#ffffff', e2: '#d04a4a', m1: '#4a4a6a', m2: '#9a7aa8', cl: '#ffe0c8', cs: '#b070a0',
    night: 0, fog: 0, mist: 0.45, cloud: 0.9 },
];
// Sertão: o sol a pino ocupa o lugar da chuva — céu esbranquiçado, chão ressecado e miragem na pista (heat)
const DRY_PHASE = {
  name: 'SOL A PINO', dur: 25, skyT: '#5a9cf0', skyM: '#a8d0f8', skyB: '#f6ecd2', g1: '#c9a45a', g2: '#bf9a50', road: '#8c8478',
  e1: '#ffffff', e2: '#d83a3a', m1: '#a06a48', m2: '#c89468', cl: '#fff8e8', cs: '#e8d8b8',
  night: 0, fog: 0, mist: 0, cloud: 0.15, heat: 1,
};
const PHASES_DRY = PHASES.map(p => (p === RAIN_PHASE ? DRY_PHASE : p));

const COLOR_KEYS = ['skyT', 'skyM', 'skyB', 'g1', 'g2', 'road', 'e1', 'e2', 'm1', 'm2', 'cl', 'cs'];
const NUM_KEYS = ['night', 'fog', 'mist', 'cloud', 'rain', 'heat'];
const BLEND = 4;                    // transição padrão entre fases (s)
const DAY_LEN = PHASES.reduce((s, p) => s + p.dur, 0);
for (const ph of [...PHASES, DRY_PHASE]) {
  ph.c = {};
  for (const k of COLOR_KEYS) ph.c[k] = hexToRgb(ph[k]);
  for (const k of NUM_KEYS) ph[k] = ph[k] || 0;
}

function getEnv(t, phases = PHASES) {
  t = ((t % DAY_LEN) + DAY_LEN) % DAY_LEN;
  let i = 0, acc = 0;
  while (t >= acc + phases[i].dur) acc += phases[i++].dur;
  const a = phases[i], b = phases[(i + 1) % phases.length];
  const blend = a.blend || BLEND;
  const k = Math.max(0, (t - acc - (a.dur - blend)) / blend);
  const env = { name: k > 0.5 ? b.name : a.name, rgb: {} };
  for (const key of COLOR_KEYS) env[key] = rgbStr(env.rgb[key] = lerpRgb(a.c[key], b.c[key], k));
  for (const key of NUM_KEYS) env[key] = a[key] + (b[key] - a[key]) * k;

  // Sol baixo: percorre a fase inteira (entardecer desce, amanhecer sobe)
  env.sun = null;
  if (a.sun) {
    const prog = (t - acc) / a.dur;
    env.sun = { x: a.sun.x * W, e: a.sun.e0 + (a.sun.e1 - a.sun.e0) * prog, a: 1 - k };
  } else if (b.sun && k > 0) {
    env.sun = { x: b.sun.x * W, e: b.sun.e0, a: k };
  }
  // Força da luz baixa (sombras, contraluz): máxima com o sol perto do horizonte
  env.low = env.sun ? env.sun.a * clamp(1.15 - Math.max(0, env.sun.e), 0, 1) * clamp((env.sun.e + 0.25) / 0.3, 0, 1) : 0;
  // Lanternas acesas só com o sol bem baixo (não no começo da manhã)
  env.lamps = env.sun ? env.low * clamp((0.45 - env.sun.e) / 0.3, 0, 1) : 0;
  env.lamps = Math.max(env.lamps, env.rain * 0.9);        // na chuva todo mundo anda de lanterna acesa
  return env;
}

// ================= Paisagens =================
// Cada dia tem uma paisagem (em ciclo). weather: 'dry' troca a chuva (2ª fase do dia) pelo sol a pino.
// layers: objetos da beira da estrada; cada camada é sorteada por "vaga" (a cada PROP_GAP) e por lado.
//   chance: probabilidade por vaga; x: distância da pista [mín, máx] em faixas; every: só a cada N vagas
const PROP_GAP = 40;
const THEMES = [
  // Estrada de terra: pista de lama com ruas de pneu e buracos (mud, holes — ver updateMud)
  { name: 'TRANSAMAZÔNICA', weather: 'rain', horizon: 'jungle', tint: [[26, 66, 34], 0.86], mud: true, holes: true,
    layers: [
      { chance: 0.78, x: [1.35, 3.8], types: [['castanheira', 3], ['palmeira', 3], ['samambaia', 4]] },
      { chance: 0.05, x: [1.5, 1.7], types: [['placaBR', 2], ['caminhaoAtolado', 1]] },
      { chance: 0.04, x: [2.4, 3.2], types: [['casaPalafita', 1]] },
    ] },
  { name: 'LITORAL', weather: 'rain', horizon: 'sea', tint: [[222, 200, 150], 0.4],
    layers: [
      { chance: 0.5, x: [1.8, 3.0], types: [['coqueiro', 1]] },
      { chance: 0.07, x: [2.2, 2.8], types: [['casa', 2], ['outdoorAzul', 1], ['placa', 1]] },
    ] },
  { name: 'FAVELA CARIOCA', weather: 'rain', horizon: 'rio', tint: [[176, 128, 96], 0.3], kites: true,
    layers: [
      { chance: 0.8, x: [1.9, 2.9], types: [['casaMorro1', 1], ['casaMorro2', 1], ['casaMorro3', 1], ['casaMorro4', 1]] },
      { chance: 1, every: 2, x: [1.72, 1.72], types: [['posteFios', 1]] },
      { chance: 0.06, x: [1.8, 1.85], types: [['orelhao', 2], ['coqueiro', 1]] },
    ] },
  { name: 'CIDADE', weather: 'rain', horizon: 'city', tint: [[128, 128, 134], 0.55],
    layers: [
      { chance: 1, every: 2, x: [1.75, 1.75], types: [['poste', 1]] },
      { chance: 0.75, x: [2.5, 3.6], types: [['predio1', 1], ['predio2', 1], ['predio3', 1]] },
      { chance: 0.05, x: [2.1, 2.2], types: [['outdoor', 1], ['outdoorAzul', 1]] },
    ] },
  { name: 'CAMPO', weather: 'rain', horizon: 'hills', tint: [[196, 184, 96], 0.22],
    layers: [
      { chance: 0.4, x: [1.9, 3.6], types: [['ipe', 3], ['ipeRoxo', 2], ['arvore', 3]] },
      { chance: 0.05, x: [2.6, 3.2], types: [['casa', 3], ['placa', 1]] },
    ] },
  // Vacas e cavalos andam pela pista (animals) — ver updateAnimals
  { name: 'SERTÃO NORDESTINO', weather: 'dry', horizon: 'caatinga', tint: [[204, 152, 84], 0.8], animals: true,
    layers: [
      { chance: 0.34, x: [1.8, 3.6], types: [['mandacaru', 3], ['palma', 3], ['arvoreSeca', 3], ['arvoreSeca2', 3]] },
      { chance: 1, every: 2, x: [1.55, 1.55], types: [['estaca', 1]] },
      { chance: 0.06, x: [2.3, 3.2], types: [['casaTaipa', 3], ['cataVento', 2]] },
      { chance: 0.05, x: [1.75, 1.85], types: [['placaGado', 1]] },
    ] },
];
// A paisagem de cada dia é sorteada de um "saco embaralhado": todas aparecem uma vez antes de qualquer
// uma repetir (variedade garantida) e a última de um saco nunca é a primeira do seguinte
let themeBag = [];
const nextTheme = (last = -1) => {
  if (!themeBag.length) {
    themeBag = THEMES.map((_, i) => i);
    for (let i = themeBag.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [themeBag[i], themeBag[j]] = [themeBag[j], themeBag[i]];
    }
    // o sorteio sai do fim do saco: se ele repetir a paisagem atual, troca com outra
    if (themeBag.length > 1 && themeBag[themeBag.length - 1] === last) themeBag.unshift(themeBag.pop());
  }
  return themeBag.pop();
};
const phasesOf = idx => (THEMES[idx].weather === 'dry' ? PHASES_DRY : PHASES);

// ================= Utilidades =================
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[(Math.random() * arr.length) | 0];
const mod = (a, n) => ((a % n) + n) % n;
// Pseudoaleatório determinístico em [0, 1): o mesmo k sempre dá o mesmo valor
const hash = k => { const s = Math.sin(k * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

function text(str, x, y, color, size = 8, align = 'left') {
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillText(str, x + 1, y + 1);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

// ================= Cenário =================
const RIDGE_N = 512;
function makeRidge(base, amp, seed) {
  const a = [];
  for (let i = 0; i < RIDGE_N; i++) {
    const t = (i / RIDGE_N) * Math.PI * 2;
    const v = 0.5 * Math.sin(t * 3 + seed) + 0.3 * Math.sin(t * 7 + seed * 2) + 0.2 * Math.sin(t * 13 + seed * 3);
    a.push(Math.max(1, Math.round(base + amp * v)));
  }
  return a;
}
const STARS = Array.from({ length: 40 }, () => [(Math.random() * W) | 0, (Math.random() * (HORIZON - 20)) | 0]);
const SPRAY = [];                   // água e lama levantadas pelos pneus

// ================= Pinturas =================
const PAINTS = [
  { name: 'VERMELHO', hex: '#c8262b' },
  { name: 'AZUL', hex: '#2a5bd7' },
  { name: 'AMARELO', hex: '#f2c21b' },
  { name: 'VERDE', hex: '#2f8a3a' },
  { name: 'BRANCO', hex: '#ecebe4' },
  { name: 'PRETO', hex: '#2a2a2e' },
  { name: 'BEGE', hex: '#d8c49a' },
  { name: 'LARANJA', hex: '#e8741e' },
  { name: 'VINHO', hex: '#7a1f33' },
  { name: 'PRATA', hex: '#a9adb3' },
  { name: 'AZUL CALCINHA', hex: '#8fb8e0' },
];
const DEFAULT_PAINTS = CARS.map(c => Math.max(0, PAINTS.findIndex(p => p.hex === c.color)));

function loadPaints() {
  const paints = DEFAULT_PAINTS.slice();
  try {
    // Mantém as cores já salvas; carros novos ficam com a cor padrão
    const a = JSON.parse(localStorage.getItem('enduro-br-colors'));
    if (Array.isArray(a)) a.forEach((v, i) => { if (i < paints.length && Number.isInteger(v) && PAINTS[v]) paints[i] = v; });
  } catch (e) { /* sem storage */ }
  return paints;
}
function savePaints() {
  try { localStorage.setItem('enduro-br-colors', JSON.stringify(G.paints)); } catch (e) { /* sem storage */ }
}
const paintOf = i => PAINTS[G.paints[i]];

function setPaint(carIdx, paintIdx) {
  G.paints[carIdx] = mod(paintIdx, PAINTS.length);
  savePaints();
  Sound.beep(660, 0.06);
}

// ================= Estado =================
const G = {
  state: 'menu', sel: 0, car: null, clock: 0, paints: loadPaints(),
  pos: 0, speed: 0, x: 0, vx: 0, hw: 0.18, crashT: 0,
  curve: 0, curveTarget: 0, segLeft: 800, bgX: 0,
  t: 0, dayEnd: DAY_LEN, day: 1, carsLeft: 0, goalMet: false, passed: 0, runT: 0,
  cars: [], spawnT: 0, banner: null, env: getEnv(0),
  animals: [], animalT: 2000, animalWarn: false, mud: 0, jolt: 0,
  // paisagem: índice atual, fronteiras no mundo (objetos) e transição do horizonte
  themeIdx: 0, themeBounds: [], horizonPrev: null, horizonT: 1,
  flash: 0, boltT: 6, bolt: null,
  goalIdx: loadGoalIdx(), records: loadRecords(), newRecord: false,
};
// O menu também mostra uma paisagem sorteada
G.themeIdx = nextTheme();
G.themeBounds = [{ z: -Infinity, idx: G.themeIdx }];

function loadGoalIdx() {
  let v = DEFAULT_GOAL;
  try { v = Number(localStorage.getItem('enduro-br-goal')) || DEFAULT_GOAL; } catch (e) { /* sem storage */ }
  const i = GOAL_OPTIONS.indexOf(v);
  return i >= 0 ? i : GOAL_OPTIONS.indexOf(DEFAULT_GOAL);
}
function setGoal(idx) {
  G.goalIdx = clamp(idx, 0, GOAL_OPTIONS.length - 1);
  try { localStorage.setItem('enduro-br-goal', String(goalBase())); } catch (e) { /* sem storage */ }
  Sound.beep(520, 0.06);
}

// Recordes separados por meta (vencer com meta 30 não se compara com meta 300)
function loadRecords() {
  try {
    const all = JSON.parse(localStorage.getItem('enduro-br-records'));
    if (all && typeof all === 'object') return all;
    const old = JSON.parse(localStorage.getItem('enduro-br-record'));   // formato antigo: meta fixa 120
    if (old && typeof old.day === 'number') return { [DEFAULT_GOAL]: old };
  } catch (e) { /* sem storage */ }
  return {};
}
function saveRecords() {
  try { localStorage.setItem('enduro-br-records', JSON.stringify(G.records)); } catch (e) { /* sem storage */ }
}
const currentRecord = () => G.records[goalBase()] || { day: 0, km: 0, car: '' };

const odoKm = () => G.pos / (KMH * 3600);
function showBanner(str, secs = 2.5) { G.banner = { text: str, t: secs, dur: secs }; }

function startRun() {
  G.car = { ...CARS[G.sel], color: paintOf(G.sel).hex };
  G.hw = (getSprite(G.car.id, G.car.color).width / 2) * PLAYER_SCALE / HALF_P;
  themeBag = [];
  const first = nextTheme();
  Object.assign(G, {
    state: 'playing', pos: 0, speed: 0, x: 0, vx: 0, crashT: 0,
    curve: 0, curveTarget: 0, segLeft: 900, bgX: 0,
    t: 0, dayEnd: DAY_LEN, day: 1, carsLeft: dayGoal(1), goalMet: false, passed: 0, runT: 0,
    cars: [], spawnT: 1, newRecord: false, animals: [], animalT: 2000, animalWarn: false, mud: 0, jolt: 0,
    themeIdx: first, themeBounds: [{ z: -Infinity, idx: first }], horizonPrev: null, horizonT: 1, flash: 0, boltT: 6,
  });
  SPRAY.length = 0;
  showBanner(`DIA 1 - ${THEMES[first].name}`, 2.5);
  Sound.beep(880, 0.15);
}

function gameOver() {
  G.state = 'gameover';
  Sound.fail();
  const km = odoKm(), r = currentRecord();
  G.newRecord = G.day > r.day || (G.day === r.day && km > r.km);
  if (G.newRecord) {
    G.records[goalBase()] = { day: G.day, km, car: G.car.name };
    saveRecords();
  }
}

function endOfDay() {
  if (!G.goalMet) return gameOver();
  G.day++;
  G.dayEnd += DAY_LEN;
  G.carsLeft = dayGoal(G.day);
  G.goalMet = false;
  // Nova paisagem: os objetos mudam a partir de um ponto lá na frente; o horizonte faz uma transição
  const idx = nextTheme(G.themeIdx);
  G.themeBounds = [G.themeBounds[G.themeBounds.length - 1], { z: G.pos + SPAWN_DIST + 200, idx }];
  G.horizonPrev = G.themeIdx;
  G.themeIdx = idx;
  G.horizonT = 0;
  G.animalWarn = false;
  showBanner(`DIA ${G.day} - ${THEMES[idx].name}`, 3);
  Sound.jingle();
}

// ================= Entrada =================
const keys = {};
const touch = { left: false, right: false, brake: false };
// Modo celular: botões na tela e aceleração automática (só freia quem aperta FREAR).
// Começa ligado em telas de toque; o primeiro toque liga, o primeiro uso do teclado desliga.
let touchMode = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
const input = {
  get left() { return keys.ArrowLeft || keys.KeyA || touch.left || Pad.act.left; },
  get right() { return keys.ArrowRight || keys.KeyD || touch.right || Pad.act.right; },
  get gas() { return keys.ArrowUp || keys.KeyW || keys.Space || keys.KeyZ || touchMode || Pad.act.accel || Pad.act.up; },
  get brake() { return keys.ArrowDown || keys.KeyS || keys.KeyX || touch.brake || Pad.act.brake || Pad.act.down; },
};

addEventListener('keydown', e => {
  touchMode = false;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
  if (!keys[e.code]) onKeyPress(e.code);
  keys[e.code] = true;
});
addEventListener('keyup', e => { keys[e.code] = false; });
function pauseIfPlaying() {
  for (const k in keys) keys[k] = false;
  touch.left = touch.right = touch.brake = false;
  if (G.state === 'playing') G.state = 'paused';
}
addEventListener('blur', pauseIfPlaying);
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseIfPlaying(); });

function onKeyPress(code) {
  Sound.init();
  if (code === 'KeyM') return Sound.toggleMute();
  const confirm = code === 'Enter' || code === 'Space';
  if (G.state === 'menu') {
    if (code === 'ArrowLeft' || code === 'KeyA') { G.sel = mod(G.sel - 1, CARS.length); Sound.beep(440); }
    else if (code === 'ArrowRight' || code === 'KeyD') { G.sel = mod(G.sel + 1, CARS.length); Sound.beep(440); }
    else if (code === 'ArrowUp' || code === 'KeyW') setPaint(G.sel, G.paints[G.sel] - 1);
    else if (code === 'ArrowDown' || code === 'KeyS') setPaint(G.sel, G.paints[G.sel] + 1);
    else if (['Minus', 'NumpadSubtract', 'KeyQ'].includes(code)) setGoal(G.goalIdx - 1);
    else if (['Equal', 'NumpadAdd', 'KeyE'].includes(code)) setGoal(G.goalIdx + 1);
    else if (code === 'KeyC') openPadConfig();
    else if (confirm) startRun();
  } else if (G.state === 'padconfig') {
    if (code === 'Escape') { Pad.cap = null; G.state = 'menu'; }
    else if (code === 'Backspace' || code === 'Delete') {
      Pad.resetCustom();
      Pad.cap = null;
      G.state = 'menu';
      showToast('CONTROLE: PADRÃO RESTAURADO');
    }
  } else if (G.state === 'playing') {
    if (code === 'KeyP') G.state = 'paused';
    else if (code === 'Escape') G.state = 'menu';
  } else if (G.state === 'paused') {
    if (code === 'KeyP' || confirm) G.state = 'playing';
    else if (code === 'Escape') G.state = 'menu';
  } else if (G.state === 'gameover') {
    if (confirm || code === 'Escape') G.state = 'menu';
  }
}

// ---- Controle (ver src/gamepad.js) ----
// Ações do controle viram as mesmas teclas do teclado, então menu, pausa etc. funcionam igual
const PAD_KEY = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', accel: 'Enter', l: 'Minus', r: 'Equal' };

function onPadPress(action) {
  const s = G.state;
  if (action === 'start') return onKeyPress(s === 'playing' || s === 'paused' ? 'KeyP' : 'Enter');
  if (action === 'select') return s === 'menu' ? openPadConfig() : onKeyPress('Escape');
  if (PAD_KEY[action]) onKeyPress(PAD_KEY[action]);
}

function openPadConfig() {
  G.state = 'padconfig';
  Pad.startCapture();
  Sound.beep(440, 0.1);
}

function showToast(str, secs = 2.5) { G.toast = { text: str, t: secs }; }
Pad.onChange = gp => showToast(gp ? 'CONTROLE CONECTADO' : 'CONTROLE DESCONECTADO');

function canvasFx(clientX) {
  const r = canvas.getBoundingClientRect();
  return (clientX - r.left) / r.width;
}
function canvasFy(clientY) {
  const r = canvas.getBoundingClientRect();
  return (clientY - r.top) / r.height;
}

// Layout do menu: um quadro por carro, amostras de cor no topo do quadro selecionado
const BOX = { x0: 4, w: 74, step: 79, y: 62, h: 70 };
const boxX = i => BOX.x0 + i * BOX.step;
const SWATCH = { size: 5, step: 6, y: 65 };
const swatchX = (carIdx, k) => boxX(carIdx) + 5 + k * SWATCH.step;
const GOAL_LINE = { y: 200, x: 196 };   // "META: < 120 >" à direita da linha da cor

function onTap(fx, fy) {
  Sound.init();
  if (G.state === 'menu') {
    const x = fx * W, y = fy * H;
    if (y >= SWATCH.y - 2 && y <= SWATCH.y + SWATCH.size + 2) {
      const k = Math.floor((x - swatchX(G.sel, 0)) / SWATCH.step);
      if (k >= 0 && k < PAINTS.length) return setPaint(G.sel, k);
    }
    if (y >= GOAL_LINE.y - 4 && y <= GOAL_LINE.y + 12 && x >= GOAL_LINE.x) {
      return setGoal(G.goalIdx + (x < GOAL_LINE.x + 58 ? -1 : 1));
    }
    const slot = clamp(Math.floor((x - BOX.x0) / BOX.step), 0, CARS.length - 1);
    if (slot === G.sel) startRun();
    else { G.sel = slot; Sound.beep(440); }
  } else if (G.state === 'paused') G.state = fy > 0.75 ? 'menu' : 'playing';   // toque embaixo: menu
  else if (G.state === 'gameover') G.state = 'menu';
}

// Botões de toque (HTML em index.html). A área de acerto é o retângulo do botão com uma folga,
// e os toques são relidos a cada movimento: dá para deslizar o dedo de ◀ para ▶ sem levantar.
const ui = {
  root: document.getElementById('touchui'),
  l: document.getElementById('tl'), r: document.getElementById('tr'),
  b: document.getElementById('tb'), p: document.getElementById('tp'),
};
function hitBtn(el, t, pad) {
  const r = el.getBoundingClientRect();
  if (!r.width) return false;   // botão oculto
  return t.clientX >= r.left - pad && t.clientX <= r.right + pad && t.clientY >= r.top - pad && t.clientY <= r.bottom + pad;
}
function readTouches(e) {
  touch.left = touch.right = touch.brake = false;
  for (const t of e.touches) {
    if (hitBtn(ui.l, t, 22)) touch.left = true;
    else if (hitBtn(ui.r, t, 22)) touch.right = true;
    if (hitBtn(ui.b, t, 22)) touch.brake = true;
  }
  ui.l.classList.toggle('down', touch.left);
  ui.r.classList.toggle('down', touch.right);
  ui.b.classList.toggle('down', touch.brake);
}
document.addEventListener('touchstart', e => {
  e.preventDefault();
  touchMode = true;
  Sound.init();
  if (G.state === 'playing') {
    if ([...e.changedTouches].some(t => hitBtn(ui.p, t, 10))) G.state = 'paused';
    readTouches(e);
    return;
  }
  const t = e.changedTouches[0];
  const fx = canvasFx(t.clientX), fy = canvasFy(t.clientY);
  // O menu só reage a toques dentro do jogo; pausa e fim de jogo, em qualquer lugar da tela
  if (G.state === 'menu' && (fx < 0 || fx > 1 || fy < 0 || fy > 1)) return;
  onTap(fx, fy);
}, { passive: false });
document.addEventListener('touchmove', e => { e.preventDefault(); if (G.state === 'playing') readTouches(e); }, { passive: false });
const touchEnd = e => { e.preventDefault(); Sound.init(); readTouches(e); };
document.addEventListener('touchend', touchEnd, { passive: false });
document.addEventListener('touchcancel', touchEnd, { passive: false });
canvas.addEventListener('mousedown', e => { if (G.state !== 'playing') onTap(canvasFx(e.clientX), canvasFy(e.clientY)); });

// ================= Simulação =================
function newSegment() {
  if (Math.random() < 0.35) G.curveTarget = 0;
  else G.curveTarget = (Math.random() < 0.5 ? -1 : 1) * rand(0.35, 1);
  G.segLeft = rand(1200, 3500);
}

function updateTrack(ds) {
  G.pos += ds;
  G.segLeft -= ds;
  if (G.segLeft <= 0) newSegment();
  G.curve += (G.curveTarget - G.curve) * Math.min(1, ds / 600);
  G.bgX += G.curve * ds * 0.03;
}

function update(dt) {
  G.clock += dt;
  const padPressed = Pad.poll();
  if (G.state === 'padconfig') {
    if (Pad.captureTick() === 'done') {
      G.state = 'menu';
      showToast('CONTROLE CONFIGURADO!');
      Sound.jingle();
    }
  } else {
    padPressed.forEach(onPadPress);
  }
  if (G.toast && (G.toast.t -= dt) <= 0) G.toast = null;

  if (G.state === 'menu' || G.state === 'padconfig') {
    updateTrack(260 * dt);
    G.t += dt * 2.5;
  } else if (G.state === 'playing') {
    updatePlaying(dt);
  }
  G.env = getEnv(G.t, phasesOf(G.themeIdx));
  G.horizonT = Math.min(1, G.horizonT + dt / 4);
  if (G.state !== 'paused') {
    updateRain(dt);
    updateSpray(dt);
  }
  if (G.state === 'playing' && G.env.name !== G.lastPhase) {
    if (G.env.name === 'CHUVA') showBanner('CHUVA! PISTA MOLHADA', 2.5);
    if (G.env.name === 'SOL A PINO') showBanner('SOL A PINO! CALOR DE RACHAR', 2.5);
    G.lastPhase = G.env.name;
  }
  const top = G.car ? G.car.topKmh * KMH : 1;
  Sound.engine(G.car ? G.speed / top : 0, G.car ? G.car.pitch : 1, G.state === 'playing');
  Sound.rain(G.state === 'playing' ? G.env.rain : 0);
}

function updatePlaying(dt) {
  const car = G.car, env = G.env;
  const top = car.topKmh * KMH;
  const steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const offroad = Math.abs(G.x) > OFFROAD_X;
  G.runT += dt;

  // Velocidade
  if (G.crashT > 0) {
    G.crashT -= dt;
    G.speed -= 200 * dt;
  } else if (input.brake) {
    G.speed -= 520 * dt;
  } else if (input.gas) {
    const a = 190 * car.accel * (1 - 0.55 * G.speed / top) * (1 - 0.18 * G.mud);
    G.speed += a * dt;
  } else {
    G.speed -= 70 * dt;
  }
  if (offroad) {
    const lim = top * 0.4;
    if (G.speed > lim) G.speed = Math.max(lim, G.speed - 500 * dt);
  }
  G.speed = clamp(G.speed, 0, top);

  // Direção: a lama e a chuva reduzem a aderência (a Kombi, mais pesada, sofre menos)
  const sr = G.speed / (130 * KMH);
  const grip = 1 - G.mud * clamp(0.32 - 0.15 * (car.mass - 1), 0.12, 0.42)
                - env.rain * clamp(0.35 - 0.15 * (car.mass - 1), 0.15, 0.45);
  const steerPow = 1.7 * car.handling * (0.35 + 0.65 * Math.min(1, G.speed / 250));
  const targetVx = G.crashT > 0 ? 0 : steer * steerPow;
  const rate = G.crashT > 0 ? 3 : 9 * grip;
  G.vx += (targetVx - G.vx) * Math.min(1, dt * rate);
  G.x += G.vx * dt;
  G.x -= (G.curve * sr * sr * 0.6 / Math.sqrt(car.mass)) * dt;   // força centrífuga
  G.x = clamp(G.x, -1.5, 1.5);

  // Lama: o quanto a pista sob o carro é de terra; buracos no caminho
  const z0 = G.pos + D_PLAYER;
  G.mud += ((THEMES[themeAtZ(z0)].mud ? 1 : 0) - G.mud) * Math.min(1, dt * 2);
  G.jolt = Math.max(0, G.jolt - dt);
  updateTrack(G.speed * dt);
  updateHoles(z0, G.pos + D_PLAYER);

  // Relógio do dia
  G.t += dt;
  if (G.t >= G.dayEnd) {
    endOfDay();
    if (G.state !== 'playing') return;
  }

  updateOpponents(dt);
  updateAnimals(dt);

  if (G.banner && (G.banner.t -= dt) <= 0) G.banner = null;
}

function laneFree(lane, z, gap) {
  return !G.cars.some(c => c.lane === lane && Math.abs(c.z - z) < gap);
}

function nearestLane(x) {
  let best = 0;
  for (let i = 1; i < LANES.length; i++) if (Math.abs(LANES[i] - x) < Math.abs(LANES[best] - x)) best = i;
  return best;
}

function farthestLane(x) {
  let best = 0;
  for (let i = 1; i < LANES.length; i++) if (Math.abs(LANES[i] - x) > Math.abs(LANES[best] - x)) best = i;
  return best;
}

function trySpawn() {
  const pk = G.speed / KMH;
  const minK = 45 + G.day * 4;
  const maxK = Math.min(108, 82 + G.day * 4);
  let z, k, lane;

  if (pk > minK + 12) {
    // À frente, mais lento que o jogador: um carro para ultrapassar
    z = G.pos + SPAWN_DIST;
    if (G.cars.filter(c => Math.abs(c.z - z) < 110).length >= 2) return;
    const free = [0, 1, 2].filter(l => laneFree(l, z, 160));
    if (!free.length) return;
    lane = pick(free);
    k = rand(minK, Math.min(maxK, pk - 10));
  } else if (G.runT > 3 && pk < maxK - 10 && Math.random() < 0.6) {
    // Por trás, mais rápido: vai ultrapassar o jogador
    z = G.pos + D_PLAYER - 60;
    lane = farthestLane(G.x);
    if (!laneFree(lane, z, 120)) return;
    k = rand(Math.max(minK, pk + 12), maxK + 8);
  } else {
    return;
  }

  const model = pick(OPP_MODELS), color = pick(OPP_COLORS.filter(c => c !== G.car.color));
  const hw = (getSprite(model, color).width / 2) * PLAYER_SCALE / HALF_P;
  G.cars.push({ z, speed: k * KMH, lane, x: LANES[lane], tx: LANES[lane], model, color, hw,
                prevRel: z - (G.pos + D_PLAYER) });
}

function updateOpponents(dt) {
  // Quanto mais rápido o jogador, mais carros encontra pela frente
  G.spawnT -= dt * Math.max(0.35, G.speed / (120 * KMH));
  if (G.spawnT <= 0) {
    G.spawnT = rand(0.5, 1.05) * Math.max(0.6, 1 - (G.day - 1) * 0.07);
    trySpawn();
  }

  const playerZ = G.pos + D_PLAYER;
  for (const c of G.cars) {
    // Carros que vêm por trás desviam do jogador
    const rel = c.z - playerZ;
    if (rel < 0 && rel > -130 && c.speed > G.speed && Math.abs(c.tx - G.x) < 0.45) {
      c.lane = farthestLane(G.x);
      c.tx = LANES[c.lane];
    }
    if (G.animals.length) avoidAnimals(c);
    c.x += clamp(c.tx - c.x, -0.8 * dt, 0.8 * dt);
    c.z += c.speed * dt;
  }

  // Não atravessar o carro da frente na mesma faixa
  for (const a of G.cars) {
    for (const b of G.cars) {
      if (a !== b && a.lane === b.lane && b.z > a.z && b.z - a.z < 60 && a.speed > b.speed) a.speed = b.speed;
    }
  }

  for (const c of G.cars) {
    const rel = c.z - playerZ;
    if (c.prevRel > 0 && rel <= 0) onPass(1);
    else if (c.prevRel <= 0 && rel > 0) onPass(-1);
    c.prevRel = rel;
    if (G.crashT <= 0 && Math.abs(rel) < CAR_LEN && Math.abs(c.x - G.x) < (c.hw + G.hw) * 0.85) crash(c, rel);
  }

  G.cars = G.cars.filter(c => {
    const d = c.z - G.pos;
    return d < 2100 && d > D_PLAYER - 200;
  });
}

function onPass(n) {
  if (n > 0) {
    G.passed++;
    if (G.goalMet) return;
    G.carsLeft--;
    if (G.carsLeft <= 0) {
      G.carsLeft = 0;
      G.goalMet = true;
      showBanner('META ATINGIDA!', 3);
      Sound.jingle();
    }
  } else if (!G.goalMet) {
    G.carsLeft++;
  }
}

function crash(c, rel) {
  const car = G.car, playerZ = G.pos + D_PLAYER;
  G.speed *= car.retain;
  G.crashT = 0.6 / Math.sqrt(car.mass);
  const dir = Math.sign(G.x - c.x) || (Math.random() < 0.5 ? -1 : 1);
  G.vx = (dir * 1.4) / car.mass;
  if (rel >= 0) {
    c.z = playerZ + CAR_LEN + 2;
    c.speed += 8 * KMH * car.mass;
  } else {
    c.z = playerZ - CAR_LEN - 2;
    c.speed = Math.min(c.speed, G.speed * 0.8);
  }
  c.prevRel = c.z - playerZ;
  Sound.crash();
  Pad.rumble(220, 0.8);
}

// ---- Animais na pista (sertão): vacas e cavalos atravessam ou ficam parados numa faixa ----
const ANIMAL_KINDS = [['vaca', 0.55], ['cavalo', 0.45]];
const ANIMAL_COATS = ['A', 'B', 'C'];

function trySpawnAnimal() {
  const z = G.pos + SPAWN_DIST;
  if (!THEMES[themeAtZ(z)].animals) return;
  const kind = Math.random() < ANIMAL_KINDS[0][1] ? 'vaca' : 'cavalo';
  const coat = kind + pick(ANIMAL_COATS);
  const spr = getProp(coat + '0');
  const a = { z, kind, coat, x: 0, vx: 0, flip: Math.random() < 0.5, ph: Math.random() * 6, frame: 0, hit: false, cued: false,
              hw: (spr.width / 2) * spr.size * PLAYER_SCALE / HALF_P };
  if (Math.random() < 0.55) {
    // Atravessa a pista devagar, vindo de um dos lados
    const side = Math.random() < 0.5 ? -1 : 1;
    a.x = side * 1.25;
    a.vx = -side * rand(0.28, 0.5);
    a.flip = a.vx < 0;
  } else {
    a.x = LANES[(Math.random() * LANES.length) | 0];     // parado no meio de uma faixa
  }
  G.animals.push(a);
  if (!G.animalWarn) { G.animalWarn = true; showBanner('CUIDADO: GADO NA PISTA!', 2.5); }
}

function updateAnimals(dt) {
  // Surgem por distância percorrida (como o tráfego): parado no acostamento ninguém aparece
  G.animalT -= G.speed * dt;
  if (G.animalT <= 0 && !G.banner) {
    G.animalT = rand(1800, 3400);
    trySpawnAnimal();
  }
  const playerZ = G.pos + D_PLAYER;
  for (const a of G.animals) {
    a.x += a.vx * dt;
    a.frame = Math.abs(a.vx) > 0.01 ? (Math.floor(G.clock * (a.hit ? 9 : 4) + a.ph) & 1) : 0;
    const d = a.z - G.pos, rel = a.z - playerZ;
    if (!a.cued && !a.hit && d < 700) {
      a.cued = true;
      if (Math.random() < 0.7) Sound.animal(a.kind, 0.035);
    }
    if (G.crashT <= 0 && !a.hit && Math.abs(rel) < CAR_LEN && Math.abs(a.x - G.x) < (a.hw + G.hw) * 0.85) crashAnimal(a);
  }
  G.animals = G.animals.filter(a => {
    const d = a.z - G.pos;
    return d < 2100 && d > D_PLAYER - 200 && !(a.vx * a.x > 0 && Math.abs(a.x) > 1.7);
  });
}

function crashAnimal(a) {
  const car = G.car;
  G.speed *= car.retain * 0.8;
  G.crashT = 0.9 / Math.sqrt(car.mass);
  const dir = Math.sign(G.x - a.x) || (Math.random() < 0.5 ? -1 : 1);
  G.vx = (dir * 1.6) / car.mass;
  a.hit = true;                       // assustado, sai correndo para o lado oposto
  a.vx = -dir * 1.4;
  a.flip = a.vx < 0;
  Sound.crash();
  Sound.animal(a.kind, 0.1);
  Pad.rumble(300, 1);
}

// Carros do tráfego desviam de um animal parado ou atravessando à frente
function avoidAnimals(c) {
  for (const a of G.animals) {
    const dz = a.z - c.z;
    if (dz > 0 && dz < 700 && Math.abs(a.x - c.tx) < 0.5) {
      c.lane = farthestLane(a.x);
      c.tx = LANES[c.lane];
    }
  }
}

// Chuva: gotas rápidas e inclinadas que "vêm" na direção da câmera com a velocidade
const DROPS = Array.from({ length: 140 }, () => {
  const x = rand(0, W), y = rand(0, VIEW_H);
  return { x, y, px: x, py: y - 6, z: rand(0.3, 1) };
});
function updateRain(dt) {
  const env = G.env;
  if (env.rain <= 0.01) { G.flash = 0; return; }
  const vx0 = W / 2 + curveOff(0), vy0 = HORIZON - 10;
  const rush = G.speed * 0.0022, wind = -40 - G.curve * G.speed * 0.04;
  for (const d of DROPS) {
    d.px = d.x; d.py = d.y;
    d.x += ((d.x - vx0) * rush * d.z + wind * d.z) * dt;
    d.y += ((d.y - vy0) * rush * d.z + 260 + 220 * d.z) * dt;
    if (d.y > VIEW_H + 4 || d.x < -8 || d.x > W + 8) {
      d.x = rand(-20, W + 20); d.y = rand(-30, 0); d.z = rand(0.3, 1);
      d.px = d.x; d.py = d.y - 6;
    }
  }
  // Relâmpagos, com o trovão chegando um pouco depois
  G.flash = Math.max(0, G.flash - dt * 3);
  if (env.rain > 0.6 && (G.boltT -= dt) <= 0) {
    G.boltT = rand(5, 11);
    G.flash = 1;
    G.bolt = { x: rand(30, W - 30), seed: (Math.random() * 233280) | 0 };
    Sound.thunder(rand(0.3, 1.2));
  }
}

// Buraco: perde velocidade (a Kombi, firme, perde menos), o carro pula para o lado e sacode
function updateHoles(z0, z1) {
  for (const h of holesBetween(z0, z1)) {
    if (Math.abs(h.x - G.x) >= h.r + G.hw * 0.55) continue;
    const car = G.car, sev = clamp((h.r - 0.09) / 0.15, 0.25, 1);
    G.speed *= 1 - (0.14 + 0.24 * sev) * (1.2 - 0.6 * car.retain);
    G.vx += (Math.random() < 0.5 ? -1 : 1) * (0.5 + 0.6 * sev) / car.mass;
    G.jolt = 0.3 + 0.2 * sev;
    Sound.thud();
    Pad.rumble(150, 0.5 + 0.4 * sev);
  }
}

function updateSpray(dt) {
  const env = G.env;
  const wet = Math.max(env.rain, G.mud * 0.7);
  if (G.state === 'playing' && wet > 0.3 && G.speed > 80) {
    const px = W / 2 + curveOff(P_PLAYER) + G.x * HALF_P;
    const halfW = getSprite(G.car.id, G.car.color).width;      // meia-largura na tela (escala 2)
    const offroad = Math.abs(G.x) > OFFROAD_X;
    let count = (G.speed / 650 * 2.5 + Math.abs(G.vx) * 2.5) * wet * (offroad ? 3 : 1);
    count = Math.floor(count) + (Math.random() < count % 1 ? 1 : 0);
    for (let i = 0; i < count && SPRAY.length < 300; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      SPRAY.push({
        x: px + side * (halfW - 5) + rand(-2, 2), y: PLAYER_Y - 2,
        vx: side * rand(10, 40) - G.vx * 30, vy: -rand(20, 70),
        t: 0, life: rand(0.35, 0.7), big: Math.random() < 0.3, mud: G.mud > 0.5,
      });
    }
  }
  for (const s of SPRAY) {
    s.t += dt;
    s.vy += 160 * dt;
    s.x += s.vx * dt;
    s.y += (s.vy + G.speed * 0.05) * dt;
  }
  for (let i = SPRAY.length - 1; i >= 0; i--) if (SPRAY[i].t >= SPRAY[i].life) SPRAY.splice(i, 1);
}

// ================= Render =================
const curveOff = p => G.curve * CURVE_AMP * (1 - p) * (1 - p);

// Brilhos/névoa são texturas pequenas ampliadas: com suavização, para não virarem blocos.
// Sprites continuam sem suavização (pixel-art nítido).
function drawGlow(img, x, y, w, h) {
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, x, y, w, h);
  ctx.imageSmoothingEnabled = false;
}

function drawSky(env) {
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON);
  g.addColorStop(0, env.skyT);
  g.addColorStop(0.55, env.skyM);
  g.addColorStop(1, env.skyB);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, HORIZON);
  if (env.sun && env.sun.a > 0.01) drawSun(env.sun);
  if (env.cloud > 0.01) drawClouds(env);
  if (G.bolt && G.flash > 0.4) drawBolt();
  drawKites(env);
  if (env.sun && env.sun.a > 0.01) drawBirds(env.sun.a);
  const n = env.night;
  if (n > 0.05) {
    STARS.forEach(([sx, sy], i) => {
      ctx.fillStyle = `rgba(255,255,255,${n * (0.45 + 0.45 * Math.sin(G.clock * 2.5 + i * 1.7))})`;
      ctx.fillRect(mod(Math.round(sx - G.bgX * 0.2), W), sy, 1, 1);
    });
    // Lua cheia com duas manchas
    const mx = mod(Math.round(250 - G.bgX * 0.1), W + 40) - 20, my = 20;
    ctx.globalAlpha = n;
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(GLOW_WARM, mx - 22, my - 22, 44, 44);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#f2efd8';
    ctx.beginPath(); ctx.arc(mx, my, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d6d2b8';
    ctx.fillRect(mx - 3, my - 2, 2, 2);
    ctx.fillRect(mx + 1, my + 1, 3, 2);
    ctx.globalAlpha = 1;
  }
}

const sunScreenX = sun => mod(sun.x - G.bgX * 0.12, W + 80) - 40;
const sunScreenY = sun => HORIZON - 4 - sun.e * 58;

// Sol pixel-art "fatiado" (estilo Atari); desenhado antes das montanhas, que o encobrem ao se pôr
function drawSun(sun) {
  const cx = Math.round(sunScreenX(sun)), cy = Math.round(sunScreenY(sun));
  if (cy < -40) return;
  // warm: 1 com o sol no horizonte (grande, alaranjado, fatiado), 0 no alto (menor, amarelo-claro, liso)
  const warm = clamp(1 - sun.e, 0, 1);
  const r = Math.round(10 + 3 * warm);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = sun.a * (0.45 + 0.3 * warm);
  drawGlow(GLOW_WARM, cx - 60, cy - 60, 120, 120);
  ctx.globalAlpha = sun.a * 0.35 * warm;
  drawGlow(GLOW_WARM, cx - 140, HORIZON - 40, 280, 70);      // faixa de brilho no horizonte
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = sun.a;
  const bottom = lerpRgb([255, 246, 200], [255, 78, 48], warm);
  for (let dy = -r; dy <= r; dy++) {
    const y = cy + dy;
    if (y >= HORIZON) break;
    if (dy > 1 && warm > 0.45) {
      // fatias que engrossam em direção à base
      const band = dy - 1, gap = Math.min(3, ((band / 4) | 0) + 1);
      if (band % 4 >= 4 - gap) continue;
    }
    const w = Math.round(Math.sqrt(r * r - dy * dy));
    ctx.fillStyle = rgbStr(lerpRgb([255, 246, 190], bottom, (dy + r) / (2 * r)));
    ctx.fillRect(cx - w, y, w * 2, 1);
  }
  ctx.globalAlpha = 1;
}

// Nuvens: de dia claras em cima; com o sol baixo, douradas por baixo e escuras por cima
const CLOUDS = Array.from({ length: 7 }, (_, i) => ({
  x: rand(0, W + 120), y: 8 + (i % 4) * 11 + rand(0, 5), w: rand(34, 70), par: rand(0.5, 1),
}));
const CLOUD_BLOBS = [[0, 1, 1], [-0.22, 0.45, 1.5], [0.18, 0.5, 1.8]];   // [deslocamento x, largura, altura]
function drawClouds(env) {
  const low = env.low, top = lerpRgb(env.rgb.cl, env.rgb.cs, low), bot = lerpRgb(env.rgb.cs, env.rgb.cl, low);
  ctx.globalAlpha = env.cloud * 0.9;
  for (const c of CLOUDS) {
    const x0 = mod(c.x - G.bgX * 0.3 * c.par - G.clock * 2 * c.par, W + 120) - 60;
    const h = Math.max(4, Math.round(c.w * 0.2)), base = c.y + h, total = Math.ceil(h * 1.8);
    // Três bolhas com a mesma base reta. Cada linha é pintada uma única vez (união das bolhas),
    // senão a transparência marca costuras onde elas se sobrepõem.
    for (let r = 0; r < total; r++) {
      const y = base - total + r;
      let l = Infinity, rt = -Infinity;
      for (const [ox, bw, bh] of CLOUD_BLOBS) {
        const hh = h * bh, t = (y - (base - hh)) / hh;          // 0 = topo da bolha
        if (t < 0 || t >= 1) continue;
        const w = c.w * bw / 2 * Math.sqrt(1 - (1 - t) * (1 - t)), cx = x0 + ox * c.w;
        l = Math.min(l, cx - w);
        rt = Math.max(rt, cx + w);
      }
      if (rt <= l) continue;
      ctx.fillStyle = rgbStr(lerpRgb(top, bot, r / (total - 1)));
      ctx.fillRect(Math.round(l), y, Math.round(rt) - Math.round(l), 1);
    }
  }
  ctx.globalAlpha = 1;
}

// Bando de pássaros em V cruzando o céu no entardecer/amanhecer
const FLOCK = [[0, 0], [7, -3], [7, 3], [14, -6], [14, 6], [21, 9]];
function drawBirds(alpha) {
  const lx = W + 40 - mod(G.clock * 14, W + 140), ly = 30 + 4 * Math.sin(G.clock * 0.5);
  ctx.fillStyle = `rgba(30,12,40,${alpha * 0.85})`;
  FLOCK.forEach(([dx, dy], i) => {
    const x = Math.round(lx + dx), y = Math.round(ly + dy);
    const up = ((G.clock * 5 + i * 0.7) | 0) % 2 === 0;
    ctx.fillRect(x - 1, y, 3, 1);
    ctx.fillRect(x - 2, y + (up ? -1 : 1), 1, 1);
    ctx.fillRect(x + 2, y + (up ? -1 : 1), 1, 1);
  });
}

// Reflexo do sol no asfalto, em direção ao horizonte
function drawSunGlare(env) {
  const sun = env.sun;
  if (!sun || sun.e < -0.15) return;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = sun.a * 0.45 * clamp((sun.e + 0.15) / 0.3, 0, 1) * (1 - Math.max(0, sun.e) * 0.6);
  drawGlow(GLOW_WARM, sunScreenX(sun) - 110, HORIZON - 12, 220, 56);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

// Sombra comprida projetada na direção da câmera (o sol está à frente)
function drawCarShadow(x, baseY, w, scale, env) {
  if (env.low <= 0.02) return;
  const len = (6 + 22 * env.low) * scale / PLAYER_SCALE;
  const dx = (x - sunScreenX(env.sun)) * 0.25 * env.low * scale / PLAYER_SCALE;
  ctx.fillStyle = `rgba(25,8,30,${0.38 * env.low})`;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.46, baseY - 1);
  ctx.lineTo(x + w * 0.46, baseY - 1);
  ctx.lineTo(x + w * 0.55 + dx, baseY + len);
  ctx.lineTo(x - w * 0.55 + dx, baseY + len);
  ctx.closePath();
  ctx.fill();
}

// Contraluz: a traseira fica na sombra e o teto ganha um contorno dourado
function drawBacklight(model, color, sx, sy, w, h, env) {
  if (env.low <= 0.02) return;
  ctx.globalAlpha = 0.45 * env.low;
  ctx.drawImage(getSprite(model, color, 'night'), sx, sy, w, h);
  ctx.globalAlpha = env.low;
  ctx.drawImage(getSprite(model, color, 'rim'), sx, sy, w, h);
  ctx.globalAlpha = 1;
}

function drawRidge(ridge, off, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let sx = 0; sx < W; sx++) {
    const h = ridge[mod(Math.floor(sx + off), RIDGE_N)];
    ctx.rect(sx, HORIZON - h, 1, h);
  }
  ctx.fill();
}

// Cor do chão tingida pela paisagem (areia no litoral, concreto na cidade...); some à noite
function tintGround(c, env, idx) {
  const t = THEMES[idx].tint;
  return t ? lerpRgb(c, t[0], t[1] * (1 - env.night)) : c;
}

const LANE_LINES = [-0.31, 0.31];     // divisórias entre as três faixas

// Estrada de terra da Transamazônica: lama no lugar do asfalto, sem faixas pintadas
const MUD_IDX = THEMES.findIndex(t => t.mud);
const MUD_ROAD = [150, 86, 52];
const MUD_EDGE = [[128, 72, 44], [110, 62, 38]];

function drawRoad(env) {
  const rgb = env.rgb;
  // Na troca de paisagem, o tom do chão e da pista acompanha a transição do horizonte
  const prev = G.horizonPrev !== null && G.horizonT < 1 ? G.horizonPrev : G.themeIdx;
  const ground = ['g1', 'g2'].map(k =>
    lerpRgb(tintGround(rgb[k], env, prev), tintGround(rgb[k], env, G.themeIdx), G.horizonT));
  const groundCss = ground.map(rgbStr);
  const lane = lerpRgb(rgb.road, [236, 236, 228], 0.75);
  const laneCss = rgbStr(lane);
  const mud = MUD_IDX >= 0 ? themeWeight(MUD_IDX) : 0;
  const dark = 1 - env.night * 0.8 - env.rain * 0.25;
  const roadRgb = mud > 0.01 ? lerpRgb(rgb.road, mulRgb(MUD_ROAD, dark), mud) : rgb.road;
  const edgeDark = 1 - env.night * 0.5 - env.rain * 0.25;      // à noite a borda continua aparecendo, para dar para ler as curvas
  const edgeRgb = [rgb.e1, rgb.e2].map((c, i) => (mud > 0.01 ? lerpRgb(c, mulRgb(MUD_EDGE[i], edgeDark), mud) : c));
  const roadCss = rgbStr(roadRgb), edgeCss = edgeRgb.map(rgbStr);

  for (let y = HORIZON; y < VIEW_H; y++) {
    const p = (y - HORIZON + 0.5) / ROAD_ROWS;
    const dist = CAM_D / p;
    const half = ROAD_HALF * p;
    const cx = W / 2 + curveOff(p);
    const s = Math.floor((G.pos + dist) / STRIPE) & 1;
    const f = fogAt(dist, env);
    const fogged = f > 0.004;
    ctx.fillStyle = fogged ? fogMix(ground[s ? 0 : 1], f) : groundCss[s ? 0 : 1];
    ctx.fillRect(0, y, W, 1);
    const l = Math.round(cx - half), r = Math.round(cx + half);
    ctx.fillStyle = fogged ? fogMix(roadRgb, f) : roadCss;
    ctx.fillRect(l, y, r - l, 1);
    const ew = Math.max(1, Math.round(half * 0.07));
    ctx.fillStyle = fogged ? fogMix(edgeRgb[s ? 0 : 1], f) : edgeCss[s ? 0 : 1];
    ctx.fillRect(l - ew, y, ew, 1);
    ctx.fillRect(r, y, ew, 1);

    // Faixas pontilhadas entre as pistas (somem na estrada de terra)
    if (mud < 0.98 && Math.floor((G.pos + dist) / 18) % 3 === 0) {
      const lw = Math.max(1, Math.round(half * 0.02));
      ctx.globalAlpha = 1 - mud;
      ctx.fillStyle = fogged ? fogMix(lane, f) : laneCss;
      for (const b of LANE_LINES) ctx.fillRect(Math.round(cx + b * half - lw / 2), y, lw, 1);
      ctx.globalAlpha = 1;
    }

    if (mud > 0.02) drawMudRow(env, y, dist, half, cx, f, mud, roadRgb);
  }
}

// Lama: ruas de pneu escuras em cada faixa e poças que refletem o céu
function drawMudRow(env, y, dist, half, cx, f, mud, road) {
  const z = G.pos + dist, k = Math.floor(z / 40);
  ctx.globalAlpha = mud;
  // As poças ocupam só o começo de cada trecho de 40 (senão virariam um retângulo enorme perto da câmera)
  // e têm perfil de elipse: mais estreitas nas pontas
  const zt = (z - k * 40) / 4.5 - 1;
  if (zt < 1 && hash(k + 3) > 0.5) {
    const x0 = hash(k + 7) * 1.5 - 0.8, w = 0.22 + hash(k + 9) * 0.4, sh = Math.sqrt(1 - zt * zt);
    const dark = 1 - env.night * 0.9 - env.rain * 0.25;
    const water = lerpRgb(lerpRgb(road, mulRgb([172, 128, 92], dark), 0.45), env.rgb.skyB, 0.1 + 0.25 * env.rain);
    ctx.fillStyle = fogMix(water, f);
    const pw = Math.max(1, Math.round(w * half * sh));
    ctx.fillRect(Math.round(cx + (x0 + w / 2) * half - pw / 2), y, pw, 1);
  }
  const tw = Math.max(1, Math.round(half * 0.05));
  ctx.fillStyle = fogMix(mulRgb(road, 0.68), f);
  for (const L of LANES) {
    for (const o of [-0.14, 0.14]) {
      const wob = 0.03 * Math.sin(z * 0.01 + L * 5);
      ctx.fillRect(Math.round(cx + (L + o + wob) * half - tw / 2), y, tw, 1);
    }
  }
  ctx.globalAlpha = 1;
}

// Buracos: presos ao mundo (sorteio determinístico por trecho, como os objetos da beira da estrada)
const HOLE_GAP = 260;
function holesBetween(z0, z1) {
  const list = [];
  for (let k = Math.floor(z0 / HOLE_GAP); k <= Math.floor(z1 / HOLE_GAP); k++) {
    for (let j = 0; j < 2; j++) {
      if (hash(k * 13.7 + j * 71.3 + 5) >= (j ? 0.1 : 0.4)) continue;
      const z = (k + 0.1 + 0.8 * hash(k * 7.7 + j * 1.3)) * HOLE_GAP;
      if (z < z0 || z >= z1 || !THEMES[themeAtZ(z)].holes) continue;
      list.push({ z, x: (hash(k * 3.1 + j * 9.7 + 1) * 2 - 1) * 0.92, r: 0.11 + 0.13 * hash(k * 5.3 + j * 2.2 + 2) });
    }
  }
  return list;
}

// Chão liso: os buracos são desenhados logo depois da pista, por baixo de carros e animais
function drawHoles(env) {
  for (const h of holesBetween(G.pos + 2, G.pos + PROP_FAR)) {
    const d = h.z - G.pos, p = CAM_D / d, y = HORIZON + p * ROAD_ROWS;
    const cx = W / 2 + curveOff(p) + h.x * ROAD_HALF * p, rw = h.r * ROAD_HALF * p, rh = Math.max(0.7, rw * 0.3);
    if (rw < 0.8 || y - rh > VIEW_H) continue;
    const f = fogAt(d, env), n = 1 - env.night * 0.85;
    const cy = y - rh * 0.6;
    ctx.fillStyle = fogMix(mulRgb([132, 78, 48], n), f);                      // borda de terra revirada
    ctx.beginPath(); ctx.ellipse(cx, cy, rw * 1.2, rh * 1.3, 0, 0, Math.PI * 2); ctx.fill();
    const water = lerpRgb([34, 20, 14], env.rgb.skyB, 0.5 * env.rain);       // fundo escuro, com água na chuva
    ctx.fillStyle = fogMix(mulRgb(water, n), f);
    ctx.beginPath(); ctx.ellipse(cx, cy + rh * 0.1, rw * 0.9, rh * 0.85, 0, 0, Math.PI * 2); ctx.fill();
  }
}

// Miragem: faixas de céu tremendo sobre o asfalto lá longe, nas fases de calor
function drawMirage(env) {
  ctx.fillStyle = env.skyB;
  for (let i = 0; i < 5; i++) {
    const y = HORIZON + 2 + i * 3, p = (y - HORIZON + 0.5) / ROAD_ROWS;
    const half = ROAD_HALF * p, cx = W / 2 + curveOff(p);
    const wave = Math.sin(G.clock * 2.2 + i * 1.7);
    ctx.globalAlpha = env.heat * 0.28 * (0.55 + 0.45 * wave);
    ctx.fillRect(Math.round(cx - half * (0.7 + 0.2 * Math.sin(G.clock * 0.9 + i * 2.3)) + wave * 2), y, Math.round(half * 1.3), 1);
  }
  ctx.globalAlpha = 1;
}

// ---- Horizontes por paisagem ----
const HILLS_FAR = makeRidge(9, 5, 2.2);
const HILLS_NEAR = makeRidge(4, 4, 5.3);
const SEA_HILLS = makeRidge(5, 4, 0.7);
function makeSkyline(minH, maxH, seed) {
  const a = [];
  let s = seed;
  while (a.length < RIDGE_N) {
    s = (s * 9301 + 49297) % 233280;
    const w = 6 + (s % 14), h = minH + (s % (maxH - minH));
    for (let k = 0; k < w; k++) a.push(h);
    if (s % 3 === 0) a.push(minH - 3, minH - 3);            // vão entre prédios
  }
  return a.slice(0, RIDGE_N);
}
const CITY_FAR = makeSkyline(12, 28, 7);
const CITY_NEAR = makeSkyline(5, 15, 13);
const CITY_LIGHTS = [];                                    // janelas acesas na silhueta, à noite
for (let i = 0; i < 160; i++) {
  const x = (Math.random() * RIDGE_N) | 0, h = CITY_FAR[x];
  if (h > 6 && CITY_NEAR[x] < h - 3) CITY_LIGHTS.push([x, CITY_NEAR[x] + 2 + ((Math.random() * (h - CITY_NEAR[x] - 3)) | 0), Math.random() * 6]);
}
// Selva: copas de árvores em duas camadas (ondulação lenta + o "abaulado" de cada copa)
function makeCanopy(base, amp, wl, seed) {
  const a = [];
  for (let i = 0; i < RIDGE_N; i++) {
    const swell = 0.5 + 0.5 * Math.sin((i / RIDGE_N) * Math.PI * 2 * 4 + seed);
    const crown = Math.abs(Math.sin((i / wl) * Math.PI + seed));
    a.push(Math.max(2, Math.round(base + amp * (0.55 * swell + 0.35 * crown) + hash(i * 1.7 + seed * 5) * 2)));
  }
  return a;
}
const JUNGLE_FAR = makeCanopy(9, 9, 16, 1.4);
const JUNGLE_NEAR = makeCanopy(5, 6, 8, 3.1);
// Caatinga: serrotes e chapadas de topo achatado (alturas em degraus)
const CAAT_FAR = makeRidge(11, 5, 3.1).map(h => Math.round(h / 3) * 3);
const CAAT_NEAR = makeRidge(4, 3, 6.2).map(h => Math.round(h / 2) * 2);
const SEA_GLINTS = Array.from({ length: 30 }, () => [(Math.random() * W) | 0, (Math.random() * 5) | 0, Math.random() * 6]);

// Rio: Corcovado (com o Cristo), Morro da Urca e Pão de Açúcar ao fundo; morros com casinhas na frente
function addPeak(a, x0, w, h, sharp) {
  for (let i = -w; i <= w; i++) {
    const t = 1 - Math.abs(i) / w;
    const v = Math.round(h * Math.pow(Math.sin(t * Math.PI / 2), sharp));
    const k = mod(x0 + i, RIDGE_N);
    a[k] = Math.max(a[k], v);
  }
}
const RIO_FAR = makeRidge(5, 3, 1.1);
const CRISTO_X = 120;
addPeak(RIO_FAR, CRISTO_X, 38, 32, 0.8);     // Corcovado
addPeak(RIO_FAR, 262, 22, 15, 0.5);           // Morro da Urca
addPeak(RIO_FAR, 300, 16, 27, 0.35);          // Pão de Açúcar (paredão arredondado)
const RIO_HILL = makeRidge(3, 2, 3.3);
addPeak(RIO_HILL, 60, 110, 22, 0.9);
addPeak(RIO_HILL, 390, 90, 17, 0.9);
// Casinhas no morro: [x, altura, cor, tem luz à noite]
const HILL_COLORS = [[232, 122, 58], [236, 132, 164], [246, 206, 82], [112, 172, 222], [124, 192, 122], [168, 88, 58], [220, 220, 210]];
const HILL_HOUSES = [];
for (let x = 0; x < RIDGE_N; x += 3) {
  for (let y = 2; y < RIO_HILL[x] - 1; y += 3) {
    const r = hash(x * 3.1 + y * 7.7);
    if (r < 0.82) HILL_HOUSES.push([x, y, (r * 97 | 0) % HILL_COLORS.length, hash(x + y * 13.3) < 0.5]);
  }
}
const CRISTO = ['..#..', '#####', '..#..', '..#..', '.###.'];

function drawRio(env, haze, c2, c1) {
  const offFar = Math.floor(G.bgX * 0.5), offNear = Math.floor(G.bgX), n = env.night;
  drawRidge(RIO_FAR, G.bgX * 0.5, c2);
  // Cristo Redentor no alto do Corcovado (iluminado à noite)
  const cx = mod(CRISTO_X - offFar, RIDGE_N) - 2, cy = HORIZON - RIO_FAR[CRISTO_X] - CRISTO.length;
  if (cx > -8 && cx < W + 8) {
    const stone = fogMix(lerpRgb(lerpRgb(env.rgb.m2, [236, 236, 228], 0.55), [255, 250, 225], n), haze * 0.8);
    if (n > 0.05) {
      const a0 = ctx.globalAlpha;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = a0 * n * 0.6 * (1 - haze);
      drawGlow(GLOW_WARM, cx - 8, cy - 8, 21, 20);
      ctx.globalAlpha = a0;
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.fillStyle = stone;
    CRISTO.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] === '#') ctx.fillRect(cx + x, cy + y, 1, 1); });
  }
  drawRidge(RIO_HILL, G.bgX, c1);
  // Casinhas coloridas no morro; à noite, um mar de janelas acesas
  const tone = HILL_COLORS.map(c => fogMix(mulRgb(lerpRgb(c, env.rgb.m1, 0.35), 1 - n * 0.85), haze * 0.9));
  const a0 = ctx.globalAlpha;
  for (const [x, y, ci, lit] of HILL_HOUSES) {
    const sx = mod(x - offNear, RIDGE_N);
    if (sx >= W) continue;
    ctx.fillStyle = tone[ci];
    ctx.fillRect(sx, HORIZON - y - 2, 2, 2);
    if (lit && n > 0.05) {
      ctx.globalAlpha = a0 * n * (0.7 + 0.3 * Math.sin(G.clock * 1.7 + x)) * (1 - haze);
      ctx.fillStyle = '#ffd27a';
      ctx.fillRect(sx, HORIZON - y - 2, 1, 1);
      ctx.globalAlpha = a0;
    }
  }
}

// Pipas no céu (com linha e rabiola), só com tempo bom e de dia
const KITE_COLORS = ['#e63946', '#f4d03f', '#2e86de', '#27ae60', '#e67e22', '#ffffff'];
const KITES = Array.from({ length: 6 }, (_, i) => ({
  x: 20 + i * 52 + Math.random() * 20, y: 14 + Math.random() * 30, c: KITE_COLORS[i % KITE_COLORS.length], ph: Math.random() * 6,
}));
function themeWeight(idx) {
  if (G.themeIdx === idx) return G.horizonPrev !== null && G.horizonPrev !== idx ? G.horizonT : 1;
  return G.horizonPrev === idx ? 1 - G.horizonT : 0;
}
function drawKites(env) {
  const idx = THEMES.findIndex(t => t.kites);
  const a = themeWeight(idx) * (1 - env.rain) * (1 - env.night) * (1 - env.fog);
  if (a <= 0.02) return;
  for (const k of KITES) {
    const x = Math.round(mod(k.x - G.bgX * 0.3 + Math.sin(G.clock * 0.7 + k.ph) * 6, W + 40) - 20);
    const y = Math.round(k.y + Math.sin(G.clock * 1.3 + k.ph) * 3);
    ctx.globalAlpha = a * 0.35;
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, y + 2);
    ctx.lineTo(x + 18.5, HORIZON - 6);
    ctx.stroke();
    ctx.globalAlpha = a;
    ctx.fillStyle = k.c;
    ctx.fillRect(x, y - 2, 1, 1);
    ctx.fillRect(x - 1, y - 1, 3, 1);
    ctx.fillRect(x - 2, y, 5, 1);
    ctx.fillRect(x - 1, y + 1, 3, 1);
    ctx.fillRect(x, y + 2, 1, 1);
    // rabiola balançando
    for (let t = 0; t < 4; t++) ctx.fillRect(x + Math.round(Math.sin(G.clock * 4 + k.ph + t) * 1.2), y + 3 + t, 1, 1);
  }
  ctx.globalAlpha = 1;
}

function drawHorizon(env, haze, idx) {
  const c2 = fogMix(env.rgb.m2, haze * 0.96), c1 = fogMix(env.rgb.m1, haze * 0.9);
  const kind = THEMES[idx].horizon;
  if (kind === 'hills') {
    drawRidge(HILLS_FAR, G.bgX * 0.5, c2);
    drawRidge(HILLS_NEAR, G.bgX, c1);
  } else if (kind === 'city') {
    drawRidge(CITY_FAR, G.bgX * 0.5, c2);
    if (env.night > 0.05) {
      const a0 = ctx.globalAlpha;
      for (const [x, h, ph] of CITY_LIGHTS) {
        const sx = mod(x - Math.floor(G.bgX * 0.5), RIDGE_N);
        if (sx >= W) continue;
        ctx.globalAlpha = a0 * env.night * (0.6 + 0.4 * Math.sin(G.clock * 1.5 + ph)) * (1 - haze);
        ctx.fillStyle = '#ffd680';
        ctx.fillRect(sx, HORIZON - h, 1, 1);
      }
      ctx.globalAlpha = a0;
    }
    drawRidge(CITY_NEAR, G.bgX, c1);
  } else if (kind === 'rio') {
    drawRio(env, haze, c2, c1);
  } else if (kind === 'jungle') {
    const day = 1 - env.night;
    drawRidge(JUNGLE_FAR, G.bgX * 0.5, fogMix(lerpRgb(env.rgb.m2, [70, 124, 84], 0.6 * day), haze * 0.96));
    drawRidge(JUNGLE_NEAR, G.bgX, fogMix(lerpRgb(env.rgb.m1, [34, 84, 46], 0.75 * day), haze * 0.9));
    ctx.globalAlpha = 0.22 * day;                       // umidade da floresta: bruma rente ao horizonte
    ctx.fillStyle = env.skyB;
    ctx.fillRect(0, HORIZON - 4, W, 4);
    ctx.globalAlpha = 1;
  } else if (kind === 'caatinga') {
    const warm = 0.6 * (1 - env.night);            // serras marrom-alaranjadas, escuras à noite
    drawRidge(CAAT_FAR, G.bgX * 0.5, fogMix(lerpRgb(env.rgb.m2, [188, 128, 88], warm), haze * 0.96));
    drawRidge(CAAT_NEAR, G.bgX, fogMix(lerpRgb(env.rgb.m1, [150, 98, 64], warm), haze * 0.9));
  } else if (kind === 'sea') {
    drawRidge(SEA_HILLS, G.bgX * 0.5, c2);
    // Mar no horizonte, refletindo o céu, com brilhos
    const deep = [20, 70, 130];
    for (let r = 0; r < 6; r++) {
      const c = lerpRgb(env.rgb.skyB, mulRgb(deep, 1 - env.night * 0.85), 0.3 + r * 0.08);
      ctx.fillStyle = fogMix(c, haze * 0.9);
      ctx.fillRect(0, HORIZON - 6 + r, W, 1);
    }
    const a0 = ctx.globalAlpha;
    ctx.fillStyle = '#fff6d8';
    for (const [x, r, ph] of SEA_GLINTS) {
      ctx.globalAlpha = a0 * Math.max(0, Math.sin(G.clock * 2.2 + ph)) * (1 - env.night * 0.7) * (1 - haze) * 0.8;
      ctx.fillRect(mod(x - Math.floor(G.bgX * 0.5), W), HORIZON - 5 + r, 2, 1);
    }
    ctx.globalAlpha = a0;
  }
}

// ---- Objetos da beira da estrada (presos ao mundo; sorteio determinístico por vaga) ----
const PROP_FAR = 1100;
function themeAtZ(z) {
  const b = G.themeBounds;
  for (let i = b.length - 1; i >= 0; i--) if (z >= b[i].z) return b[i].idx;
  return b[0].idx;
}
function pickWeighted(types, r) {
  let v = r * types.reduce((s, t) => s + t[1], 0);
  for (const [name, w] of types) if ((v -= w) < 0) return name;
  return types[0][0];
}
function roadsideProps() {
  const list = [];
  const k0 = Math.ceil((G.pos + D_PLAYER - 60) / PROP_GAP), k1 = Math.floor((G.pos + PROP_FAR) / PROP_GAP);
  for (let k = k0; k <= k1; k++) {
    const z = k * PROP_GAP, d = z - G.pos;
    if (d <= 2) continue;
    THEMES[themeAtZ(z)].layers.forEach((L, li) => {
      if (L.every && k % L.every) return;
      for (const side of [-1, 1]) {
        if (hash(k * 7.13 + li * 131.7 + side * 17.3) >= L.chance) continue;
        const prop = pickWeighted(L.types, hash(k * 3.7 + li * 51.1 + side * 9.9));
        const x = side * (L.x[0] + (L.x[1] - L.x[0]) * hash(k * 1.9 + li * 7.7 + side * 3.3));
        // o braço do poste aponta para a pista; o resto vira para um lado ou outro
        const flip = prop === 'poste' ? side > 0 : hash(k + side * 5.5) < 0.5;
        list.push({ d, prop, x, flip });
      }
    });
  }
  return list;
}

function drawProp(o, env) {
  const p = CAM_D / o.d, y = HORIZON + p * ROAD_ROWS;
  const base = getProp(o.prop, 'normal', o.flip);
  const scale = PLAYER_SCALE * p / P_PLAYER * base.size;
  const rw = Math.max(1, Math.round(base.width * scale)), rh = Math.max(1, Math.round(base.height * scale));
  const ax = W / 2 + curveOff(p) + o.x * ROAD_HALF * p;
  const sx = Math.round(ax - base.anchor * scale), sy = Math.round(y - rh);
  if (sx > W || sx + rw < 0 || sy > VIEW_H) return;
  // Animais de noite só aparecem no facho do farol (os olhos brilham no escuro)
  const n = o.animal ? env.night * (1 - beamLight(o.d, o.x) * 0.95) : env.night, f = fogAt(o.d, env);
  if (o.animal) drawCarShadow(ax, y, rw, scale, env);

  if (n < 0.99) ctx.drawImage(base, sx, sy, rw, rh);
  if (n > 0.01) {
    ctx.globalAlpha = n;
    ctx.drawImage(getProp(o.prop, 'night', o.flip), sx, sy, rw, rh);
  }
  if (f > 0.01) {
    ctx.globalAlpha = f;
    ctx.drawImage(getProp(o.prop, 'solid', o.flip, hazeHex), sx, sy, rw, rh);
  }
  ctx.globalAlpha = 1;

  // Poste aceso: lâmpada e poça de luz no chão
  const lampOn = Math.max(n, env.rain * 0.6, env.fog * 0.5, env.lamps);
  if (base.lamp && lampOn > 0.05) {
    const lx = sx + base.lamp[0] * scale, ly = sy + base.lamp[1] * scale, r = 9 * scale;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = lampOn * (1 - f * 0.6);
    drawGlow(GLOW_WARM, lx - r, ly - r, r * 2, r * 2);
    ctx.globalAlpha = lampOn * 0.35 * (1 - f);
    drawGlow(GLOW_WARM, lx - r * 2.2, y - r * 0.5, r * 4.4, r);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}

// ---- Neblina ----
const FOG_RGB = [165, 168, 173];
const FOG_HEX = '#a5a8ad';
const FOG_PUFF = makeGlow(212, 215, 220);
const PUFF_GAP = 55;
let fogVis = 230;                   // distância de visibilidade; recalculada a cada frame

// Bancos de neblina: a densidade oscila ao longo da estrada
const updateFogVis = () => { fogVis = 215 + 85 * Math.sin(G.pos * 0.00045) + 25 * Math.sin(G.pos * 0.0013); };
let hazeRGB = FOG_RGB, hazeHex = FOG_HEX;
// Neblina rosada baixa do amanhecer
const MIST_RGB = [238, 204, 214];
const MIST_HEX = '#eeccd6';
// Chuva: névoa cinza-azulada leve
const RAIN_RGB = [118, 126, 138];
const RAIN_HEX = '#767e8a';
const hazeAmt = env => Math.max(env.fog, env.mist, env.rain * 0.3);
const fogAt = (d, env) => {
  const h = hazeAmt(env);
  return h <= 0.001 ? 0 : h * (1 - Math.exp(-Math.max(0, d - 85) / fogVis));
};
const fogMix = (c, f) => rgbStr(f > 0.004 ? lerpRgb(c, hazeRGB, f) : c);

// Nuvens de neblina rente ao chão, presas ao mundo: vêm na direção do jogador
function fogPuffs(env) {
  const list = [];
  const k0 = Math.floor((G.pos + D_PLAYER - 40) / PUFF_GAP), k1 = Math.floor((G.pos + 650) / PUFF_GAP);
  for (let k = k0; k <= k1; k++) {
    if (hash(k) < 0.3) continue;
    const d = k * PUFF_GAP - G.pos;
    if (d <= 1) continue;
    const near = clamp((d - D_PLAYER + 35) / 90, 0, 1);
    list.push({
      d, puff: true,
      x: hash(k + 17) * 3.2 - 1.6 + 0.25 * Math.sin(G.clock * 0.4 + k),
      size: 0.9 + hash(k + 31) * 1.6,
      a: env.fog * (0.45 + 0.35 * hash(k + 53)) * near,
    });
  }
  return list;
}

function drawPuff(o) {
  if (o.a <= 0.01) return;
  const p = CAM_D / o.d;
  const y = HORIZON + p * ROAD_ROWS;
  const w = o.size * ROAD_HALF * p, h = w * 0.4;
  const x = W / 2 + curveOff(p) + o.x * ROAD_HALF * p;
  ctx.globalAlpha = o.a;
  drawGlow(FOG_PUFF, x - w, y - h * 1.3, w * 2, h * 2);
  ctx.globalAlpha = 1;
}

function drawNightOverlay(env) {
  const g = ctx.createLinearGradient(0, HORIZON, 0, VIEW_H);
  g.addColorStop(0, `rgba(0,0,0,${0.95 * env.night})`);
  g.addColorStop(0.5, `rgba(0,0,0,${0.7 * env.night})`);
  g.addColorStop(1, `rgba(0,0,0,${0.4 * env.night})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, HORIZON, W, ROAD_ROWS);
}

// ---- Faróis do jogador ----
const BEAM_FAR = 320;               // alcance do farol (distância da câmera)
const beamHalf = d => 0.18 + Math.max(0, d - D_PLAYER) * 0.0035;   // meia-largura do facho, em faixas

function beamPoly(widthMul) {
  const left = [], right = [];
  for (let i = 0; i <= 10; i++) {
    const d = D_PLAYER + 6 + (BEAM_FAR - D_PLAYER - 6) * (i / 10);
    const p = CAM_D / d;
    const y = HORIZON + p * ROAD_ROWS;
    const cx = W / 2 + curveOff(p) + G.x * ROAD_HALF * p;
    const hw = beamHalf(d) * widthMul * ROAD_HALF * p;
    left.push([cx - hw, y]);
    right.unshift([cx + hw, y]);
  }
  ctx.beginPath();
  for (const [x, y] of left.concat(right)) ctx.lineTo(x, y);
  ctx.closePath();
}

function drawHeadlights(level) {
  const yFar = HORIZON + (CAM_D / BEAM_FAR) * ROAD_ROWS;
  ctx.globalCompositeOperation = 'lighter';
  for (const [mul, a] of [[2.1, 0.05], [1.6, 0.08], [1.15, 0.12], [0.8, 0.12]]) {
    const g = ctx.createLinearGradient(0, PLAYER_Y - 10, 0, yFar);
    g.addColorStop(0, `rgba(255,228,160,${a * level})`);
    g.addColorStop(0.6, `rgba(255,228,160,${a * 0.6 * level})`);
    g.addColorStop(1, 'rgba(255,228,160,0)');
    ctx.fillStyle = g;
    beamPoly(mul);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}

// Quanto um carro na distância d e posição lateral x é iluminado pelo farol (0..1)
function beamLight(d, x) {
  const t = (d - D_PLAYER) / (BEAM_FAR - D_PLAYER);
  if (t < -0.4 || t > 1) return 0;
  const lat = 1 - clamp(Math.abs(x - G.x) / (beamHalf(d) + 0.15), 0, 1);
  return Math.pow(1 - Math.max(0, t), 0.6) * Math.min(1, lat * 2);
}

function drawTailGlow(spr, sx, sy, scale, alpha, radius) {
  if (alpha <= 0.01) return;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(1, alpha);
  for (const [lx, ly] of spr.lights) {
    drawGlow(GLOW_RED, sx + lx * scale - radius, sy + ly * scale - radius, radius * 2, radius * 2);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function drawOpponent(c, d, env) {
  const p = CAM_D / d;
  const y = HORIZON + p * ROAD_ROWS;
  const scale = PLAYER_SCALE * p / P_PLAYER;
  const base = getSprite(c.model, c.color);
  const dw = base.width * scale, dh = base.height * scale;
  if (y - dh > VIEW_H) return;
  const x = W / 2 + curveOff(p) + c.x * ROAD_HALF * p;
  const sx = Math.round(x - dw / 2), sy = Math.round(y - dh);
  const rw = Math.max(1, Math.round(dw)), rh = Math.max(1, Math.round(dh));
  const n = env.night;
  const f = fogAt(d, env);

  drawCarShadow(x, y, dw, scale, env);
  if (n <= 0.01) {
    ctx.drawImage(base, sx, sy, rw, rh);
    drawBacklight(c.model, c.color, sx, sy, rw, rh, env);
    if (f > 0.01 || env.fog > 0.01 || env.lamps > 0.02) drawCarLights(c, base, sx, sy, rw, rh, scale, 0, f, env);
    return;
  }
  // À noite: de longe só as lanternas; de perto, a silhueta; no facho do farol, as cores reais
  const sil = clamp(1.3 - d / 450, 0, 1);
  const vis = (1 - n) + n * beamLight(d, c.x) * 0.95;
  if (sil > 0.02) {
    ctx.globalAlpha = n * sil;
    ctx.drawImage(getSprite(c.model, c.color, 'night'), sx, sy, rw, rh);
  }
  if (vis > 0.02) {
    ctx.globalAlpha = vis;
    ctx.drawImage(base, sx, sy, rw, rh);
  }
  ctx.globalAlpha = 1;
  drawCarLights(c, base, sx, sy, rw, rh, scale, n, f, env);
}

// Neblina sobre o carro + lanternas (que atravessam a neblina antes da carroceria)
function drawCarLights(c, base, sx, sy, rw, rh, scale, n, f, env) {
  if (f > 0.01) {
    ctx.globalAlpha = f;
    ctx.drawImage(getSprite(c.model, hazeHex, 'solid'), sx, sy, rw, rh);
  }
  // lanternas acesas à noite, na neblina e com o sol baixo
  const la = Math.max(n, env.fog * (1 - f * 0.5), env.lamps * 0.6);
  if (la > 0.01) {
    ctx.globalAlpha = la;
    ctx.drawImage(getSprite(c.model, c.color, 'lights'), sx, sy, rw, rh);
  }
  ctx.globalAlpha = 1;
  const radius = Math.max(3, 6 * scale) * (1 + 0.9 * env.fog);
  drawTailGlow(base, sx, sy, rw / base.width, la, radius);
  if (env.rain > 0.01) drawWetReflection(base, sx, rw / base.width, la * env.rain * 0.55, radius, sy + rh);
}

function drawPlayer(env) {
  const n = env.night;
  const spr = getSprite(G.car.id, G.car.color);
  const dw = spr.width * PLAYER_SCALE, dh = spr.height * PLAYER_SCALE;
  const px = W / 2 + curveOff(P_PLAYER) + G.x * HALF_P;
  const rough = G.crashT > 0 || G.jolt > 0 || (Math.abs(G.x) > OFFROAD_X && G.speed > 50);
  const shx = rough ? Math.round(rand(-1.5, 1.5)) : 0;
  const shy = rough ? Math.round(rand(-1, 1)) : (G.speed > 400 && (G.clock * 20 | 0) % 2 ? 1 : 0);
  const sx = Math.round(px - dw / 2) + shx, sy = PLAYER_Y - dh + shy;

  drawCarShadow(px + shx, PLAYER_Y + shy, dw, PLAYER_SCALE, env);
  if (n > 0.01) {
    ctx.globalAlpha = n;
    ctx.drawImage(getSprite(G.car.id, G.car.color, 'night'), sx, sy, dw, dh);
    ctx.globalAlpha = 1 - n * 0.8;   // um pouco da cor ainda aparece, refletindo o farol
  }
  ctx.drawImage(spr, sx, sy, dw, dh);
  ctx.globalAlpha = 1;
  drawBacklight(G.car.id, G.car.color, sx, sy, dw, dh, env);

  // Lanternas: acesas à noite, na neblina e ao entardecer; mais fortes ao frear
  const braking = input.brake && G.speed > 0;
  const lit = Math.max(n, env.fog * 0.8, env.lamps * 0.6);
  const glow = braking ? 0.55 + 0.45 * lit : 0.6 * lit;
  drawTailGlow(spr, sx, sy, PLAYER_SCALE, glow, braking ? 14 : 10);
  if (env.rain > 0.01) drawWetReflection(spr, sx, PLAYER_SCALE, glow * env.rain * 0.6, braking ? 14 : 10, sy + dh);
}

// Halo difuso dos faróis na neblina, logo à frente do carro
function drawFogHalo(env) {
  const px = W / 2 + curveOff(P_PLAYER) + G.x * HALF_P;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = env.fog * 0.3;
  drawGlow(GLOW_WARM, px - 55, PLAYER_Y - 62, 110, 50);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function drawSpray(env) {
  for (const s of SPRAY) {
    ctx.fillStyle = s.mud ? `rgba(118,70,42,${(1 - s.t / s.life) * 0.9})` : `rgba(185,198,215,${(1 - s.t / s.life) * 0.7})`;
    const sz = s.big ? 2 : 1;
    ctx.fillRect(Math.round(s.x), Math.round(s.y), sz, sz);
  }
}

function drawRain(env) {
  ctx.strokeStyle = `rgba(190,205,225,${0.55 * env.rain})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const d of DROPS) {
    ctx.moveTo(d.px, d.py);
    ctx.lineTo(d.x, d.y);
  }
  ctx.stroke();
}

// Raio em zigue-zague até o horizonte (desenhado no céu, atrás das montanhas)
function drawBolt() {
  let x = G.bolt.x, y = 0, s = G.bolt.seed;
  ctx.strokeStyle = `rgba(240,240,255,${G.flash})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  while (y < HORIZON - 10) {
    s = (s * 9301 + 49297) % 233280;
    x += (s / 233280 - 0.5) * 14;
    y += 4 + (s % 5);
    ctx.lineTo(Math.round(x) + 0.5, y);
  }
  ctx.stroke();
}

// Reflexo das lanternas no asfalto molhado: uma faixa vermelha esticada para baixo
function drawWetReflection(spr, sx, scale, alpha, radius, baseY) {
  if (alpha <= 0.01) return;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(1, alpha);
  for (const [lx] of spr.lights) {
    const x = sx + lx * scale;
    drawGlow(GLOW_RED, x - radius * 0.35, baseY - radius * 0.2, radius * 0.7, radius * 2.4);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function drawBanner() {
  const b = G.banner;
  const a = Math.min(1, b.t / 0.4, (b.dur - b.t) / 0.2 + 0.2);
  ctx.globalAlpha = clamp(a, 0, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 104, W, 24);
  text(b.text, W / 2, 112, '#ffd24a', 8, 'center');
  ctx.globalAlpha = 1;
}

function drawFlag(x, y, color) {
  ctx.fillStyle = '#cfcfcf';
  ctx.fillRect(x, y, 1, 10);
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y, 7, 5);
}

function drawHUD(env) {
  ctx.fillStyle = '#20130b';
  ctx.fillRect(0, VIEW_H, W, H - VIEW_H);
  ctx.fillStyle = '#6b3d1f';
  ctx.fillRect(0, VIEW_H, W, 2);

  text(`DIA ${G.day}`, 8, 207, '#ffd24a');

  ctx.fillStyle = '#000';
  ctx.fillRect(112, 204, 96, 13);
  ctx.strokeStyle = '#6b3d1f';
  ctx.strokeRect(111.5, 203.5, 97, 14);
  text(`${odoKm().toFixed(1).padStart(6, '0')} KM`, W / 2, 207, '#f0f0f0', 8, 'center');

  if (!G.goalMet) {
    drawFlag(270, 205, '#e03030');
    text(String(G.carsLeft), 312, 207, '#ffffff', 8, 'right');
  } else if ((G.clock * 3 | 0) % 2 === 0) {
    for (let i = 0; i < 3; i++) drawFlag(276 + i * 12, 205, '#30d050');
  }

  text(G.car.name, 8, 225, '#ffffff');
  text(`${String(Math.round(G.speed / KMH)).padStart(3, '0')} KM/H`, W / 2, 225, '#9fe07a', 8, 'center');
  text(env.name, 312, 225, '#b0b0ff', 8, 'right');
}

function drawMenu() {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, H);
  text('ENDURO', W / 2, 12, '#ff9a2a', 24, 'center');
  text('EDIÇÃO BRASILEIRA', W / 2, 42, '#ffffff', 8, 'center');

  const blink = (G.clock * 4 | 0) % 2 === 0;
  for (let i = 0; i < CARS.length; i++) {
    const c = CARS[i], sel = i === G.sel;
    const bx = boxX(i), by = BOX.y, bw = BOX.w, bh = BOX.h, cx = bx + bw / 2;
    ctx.fillStyle = sel ? 'rgba(255,210,74,0.15)' : 'rgba(255,255,255,0.05)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = sel ? (blink ? '#ffd24a' : '#ff9a2a') : '#555';
    ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
    const spr = getSprite(c.id, paintOf(i).hex);
    const dw = spr.width * 3, dh = spr.height * 3;
    const bob = sel ? Math.round(Math.sin(G.clock * 8)) : 0;
    ctx.drawImage(spr, Math.round(cx - dw / 2), by + bh - 6 - dh + bob, dw, dh);
    text(c.name, cx, by + bh + 5, sel ? '#ffd24a' : '#aaaaaa', 8, 'center');
    if (sel) drawSwatches(i);
  }

  const car = CARS[G.sel];
  text(car.desc, W / 2, 148, '#ffffff', 8, 'center');
  const stats = [
    ['VELOCIDADE', (car.topKmh - 90) / 70],
    ['ACELERAÇÃO', car.accel / 1.25],
    ['CONTROLE', car.handling / 1.2],
    ['RESISTÊNCIA', car.retain / 0.6],
  ];
  stats.forEach(([label, v], i) => {
    const y = 159 + i * 10;
    text(label, 36, y, '#cccccc');
    const filled = Math.round(clamp(v, 0, 1) * 10);
    for (let s = 0; s < 10; s++) {
      ctx.fillStyle = s < filled ? '#ffd24a' : '#3a3a3a';
      ctx.fillRect(140 + s * 14, y, 12, 7);
    }
  });

  // Cor atual (esquerda) e meta de ultrapassagens (direita)
  const paint = paintOf(G.sel), ly = GOAL_LINE.y;
  ctx.fillStyle = '#000';
  ctx.fillRect(7, ly - 1, 10, 10);
  ctx.fillStyle = paint.hex;
  ctx.fillRect(8, ly, 8, 8);
  text(`COR: ${paint.name}`, 20, ly, '#ffffff');
  const g = goalBase();
  text('META:', GOAL_LINE.x, ly, '#ffffff');
  text('<', GOAL_LINE.x + 44, ly, G.goalIdx > 0 ? '#ff9a2a' : '#555555');
  text(String(g).padStart(3, ' '), GOAL_LINE.x + 58, ly, '#ffd24a');
  text('>', GOAL_LINE.x + 90, ly, G.goalIdx < GOAL_OPTIONS.length - 1 ? '#ff9a2a' : '#555555');
  drawFlag(GOAL_LINE.x + 102, ly - 2, '#e03030');

  if (blink) text(touchMode ? 'TOQUE NO CARRO ESCOLHIDO: CORRER' : '<>CARRO ^vCOR -+META ENTER:CORRER', W / 2, 214, '#ff9a2a', 8, 'center');
  // Última linha: recorde, alternando com a dica do controle quando há um conectado
  const r = currentRecord();
  const padHint = Pad.id && (r.day === 0 || (G.clock / 3 | 0) % 2 === 1);
  if (padHint) text('CONTROLE: SELECT CONFIGURA', W / 2, 228, '#8fb8e0', 8, 'center');
  else if (r.day > 0) text(`RECORDE: DIA ${r.day} - ${r.km.toFixed(1)} KM (${r.car})`, W / 2, 228, '#9fe07a', 8, 'center');
}

function drawSwatches(carIdx) {
  const cur = G.paints[carIdx];
  PAINTS.forEach((p, k) => {
    const x = swatchX(carIdx, k), y = SWATCH.y;
    ctx.fillStyle = k === cur ? '#ffffff' : '#000000';
    ctx.fillRect(x - 1, y - 1, SWATCH.size + 2, SWATCH.size + 2);
    ctx.fillStyle = p.hex;
    ctx.fillRect(x, y, SWATCH.size, SWATCH.size);
  });
}

function drawOverlay(title, color, lines) {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, W, H);
  text(title, W / 2, 60, color, 16, 'center');
  lines.forEach(([str, col], i) => text(str, W / 2, 100 + i * 16, col, 8, 'center'));
}

function render() {
  const env = G.env;
  ui.root.classList.toggle('on', touchMode && G.state === 'playing');
  const playing = G.state !== 'menu' && G.state !== 'padconfig';

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, VIEW_H);
  ctx.clip();

  const fog = env.fog > 0.01;
  const haze = hazeAmt(env);
  // A névoa que domina define a cor: neblina cinza, bruma rosada ou o cinza-azulado da chuva
  [, hazeRGB, hazeHex] = [[env.fog, FOG_RGB, FOG_HEX], [env.mist, MIST_RGB, MIST_HEX], [env.rain * 0.3, RAIN_RGB, RAIN_HEX]]
    .reduce((best, h) => (h[0] > best[0] ? h : best));
  updateFogVis();
  drawSky(env);
  if (haze > 0.01) {
    ctx.fillStyle = `rgba(${hazeRGB},${0.9 * env.fog})`;
    ctx.fillRect(0, 0, W, HORIZON);
  }
  // Horizonte da paisagem (com transição suave quando a paisagem muda)
  if (G.horizonPrev !== null && G.horizonT < 1) {
    ctx.globalAlpha = 1 - G.horizonT;
    drawHorizon(env, haze, G.horizonPrev);
    ctx.globalAlpha = G.horizonT;
    drawHorizon(env, haze, G.themeIdx);
    ctx.globalAlpha = 1;
  } else {
    drawHorizon(env, haze, G.themeIdx);
  }
  drawRoad(env);
  drawHoles(env);
  if (env.heat > 0.02) drawMirage(env);
  if (env.sun) drawSunGlare(env);
  if (env.night > 0.01) drawNightOverlay(env);

  // Carros, objetos da estrada e nuvens de neblina ordenados por profundidade (de longe para perto)
  const items = playing ? G.cars.map(c => ({ c, d: c.z - G.pos })).filter(o => o.d > 1) : [];
  items.push(...roadsideProps());
  if (playing) {
    for (const a of G.animals) {
      const d = a.z - G.pos;
      if (d > 1) items.push({ d, prop: `${a.coat}${a.frame}`, x: a.x, flip: a.flip, animal: true });
    }
  }
  if (fog) items.push(...fogPuffs(env));
  items.sort((a, b) => b.d - a.d);
  const drawItem = o => (o.puff ? drawPuff(o) : o.prop ? drawProp(o, env) : drawOpponent(o.c, o.d, env));

  const beam = Math.max(env.night, env.fog * 0.5, env.rain * 0.45);
  if (playing && beam > 0.01) drawHeadlights(beam);
  for (const o of items) if (o.d > D_PLAYER) drawItem(o);
  if (playing) {
    if (fog) drawFogHalo(env);
    drawPlayer(env);
    if (SPRAY.length) drawSpray(env);
  }
  for (const o of items) if (o.d <= D_PLAYER) drawItem(o);
  if (env.rain > 0.01) drawRain(env);
  if (G.flash > 0.01) {
    ctx.fillStyle = `rgba(230,235,255,${0.45 * G.flash})`;
    ctx.fillRect(0, 0, W, VIEW_H);
  }
  if (playing && G.banner) drawBanner();
  ctx.restore();

  if (playing) drawHUD(env);
  else {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, VIEW_H, W, H - VIEW_H);
  }

  const blink = (G.clock * 3 | 0) % 2 === 0;
  if (G.state === 'menu') {
    drawMenu();
  } else if (G.state === 'padconfig') {
    drawPadConfig();
  } else if (G.state === 'paused') {
    drawOverlay('PAUSADO', '#ffd24a', touchMode
      ? [['TOQUE: CONTINUAR', '#ffffff'], ['TOQUE EMBAIXO: MENU', '#aaaaaa']]
      : [['P, ENTER OU START: CONTINUAR', '#ffffff'], ['ESC OU SELECT: MENU', '#aaaaaa']]);
  } else if (G.state === 'gameover') {
    const lines = [
      [`VOCÊ CHEGOU AO DIA ${G.day}`, '#ffffff'],
      [`${odoKm().toFixed(1)} KM PERCORRIDOS`, '#ffffff'],
      [`FALTARAM ${G.carsLeft} CARROS`, '#ffd24a'],
      [`${G.passed} ULTRAPASSAGENS`, '#9fe07a'],
    ];
    lines.push([G.newRecord && blink ? 'NOVO RECORDE!' : '', '#ff9a2a']);
    lines.push([blink ? (touchMode ? 'TOQUE: VOLTAR AO MENU' : 'ENTER: VOLTAR AO MENU') : '', '#aaaaaa']);
    drawOverlay('FIM DE JOGO', '#ff5040', lines);
  }
  if (G.toast) drawToast();
}

function drawToast() {
  const str = G.toast.text, w = str.length * 8 + 12;
  ctx.globalAlpha = clamp(G.toast.t / 0.3, 0, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(Math.round(W / 2 - w / 2), 2, w, 13);
  text(str, W / 2, 5, '#8fb8e0', 8, 'center');
  ctx.globalAlpha = 1;
}

// Tela de configuração do controle: pede cada ação em sequência
function drawPadConfig() {
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(0, 0, W, H);
  text('CONFIGURAR', W / 2, 20, '#ff9a2a', 16, 'center');
  text('CONTROLE', W / 2, 40, '#ff9a2a', 16, 'center');
  const blink = (G.clock * 3 | 0) % 2 === 0;

  if (!Pad.id) {
    text('CONECTE O CONTROLE NO USB', W / 2, 96, '#ffffff', 8, 'center');
    text('E APERTE QUALQUER BOTÃO', W / 2, 110, '#ffffff', 8, 'center');
  } else {
    const name = Pad.id.replace(/\s*\(.*$/, '').toUpperCase().replace(/[^A-Z0-9 \-:.]/g, '').slice(0, 38) || 'CONTROLE';
    text(name, W / 2, 66, '#888888', 8, 'center');
    const cap = Pad.cap, step = cap ? cap.step : 0;
    if (cap && !cap.rest) {
      text('SOLTE TODOS OS BOTÕES', W / 2, 100, '#ffffff', 8, 'center');
    } else if (cap) {
      text('APERTE NO CONTROLE:', W / 2, 88, '#ffffff', 8, 'center');
      const color = cap.wait ? '#888888' : (blink ? '#ffd24a' : '#ff9a2a');
      text(PAD_LABELS[Pad.captureAction()], W / 2, 104, color, 16, 'center');
      if (cap.wait && step > 0) text('SOLTE O BOTÃO...', W / 2, 126, '#888888', 8, 'center');
      // Barra de progresso
      const bw = 200, bx = (W - bw) / 2;
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(bx, 144, bw, 6);
      ctx.fillStyle = '#ffd24a';
      ctx.fillRect(bx, 144, Math.round(bw * step / PAD_ACTIONS.length), 6);
      text(`${step + 1}/${PAD_ACTIONS.length}`, W / 2, 156, '#aaaaaa', 8, 'center');
    }
    text(Pad.hasCustom() ? 'USANDO: CONFIGURAÇÃO PRÓPRIA' : 'USANDO: MAPEAMENTO AUTOMÁTICO', W / 2, 180, '#8fb8e0', 8, 'center');
  }
  text('ESC: CANCELAR   DEL: PADRÃO', W / 2, 222, '#aaaaaa', 8, 'center');
}

// ================= Loop =================
if (document.fonts) document.fonts.load(`8px ${FONT}`);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
