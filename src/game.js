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
  { id: 'kombi', name: 'KOMBI', color: '#2a5bd7', desc: 'LENTA, MAS FIRME NA NEVE',
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
const PHASES = [
  { name: 'DIA', dur: 40, sun: { x: 0.34, e0: 0.9, e1: 1.8 }, skyT: '#3f7fe0', skyM: '#6aa2f0', skyB: '#8fc0ff', g1: '#2f8f2f', g2: '#2a822a', road: '#6f6f6f',
    e1: '#ffffff', e2: '#d83a3a', m1: '#2e6a3a', m2: '#5f8fb0', cl: '#ffffff', cs: '#c8d8f0',
    night: 0, fog: 0, snow: 0, mist: 0, cloud: 0.5 },
  { name: 'NEVE', dur: 25, skyT: '#9fb8d8', skyM: '#c0d2e8', skyB: '#dfe9f5', g1: '#f4f7fc', g2: '#e2e9f3', road: '#9ba2ab',
    e1: '#ffffff', e2: '#4a78c0', m1: '#dbe4f0', m2: '#b7c6da', cl: '#eef2f8', cs: '#b8c4d4',
    night: 0, fog: 0, snow: 1, mist: 0, cloud: 0.8 },
  { name: 'ENTARDECER', dur: 30, blend: 10, sun: { x: 0.64, e0: 0.95, e1: -0.2 },
    skyT: '#2c1850', skyM: '#b8386a', skyB: '#ffb040', g1: '#5f6a20', g2: '#57611c', road: '#5b4f4a',
    e1: '#ffe0b0', e2: '#c04020', m1: '#3a1834', m2: '#7a2c4c', cl: '#ffd070', cs: '#8a3060',
    night: 0, fog: 0, snow: 0, mist: 0, cloud: 1 },
  { name: 'NOITE', dur: 35, blend: 10, skyT: '#000008', skyM: '#02020f', skyB: '#05051a', g1: '#050805', g2: '#030503', road: '#0c0c0c',
    e1: '#7a7a7a', e2: '#505050', m1: '#0a0a16', m2: '#10102a', cl: '#1a1a2a', cs: '#0a0a14',
    night: 1, fog: 0, snow: 0, mist: 0, cloud: 0 },
  { name: 'NEBLINA', dur: 20, skyT: '#8c8f94', skyM: '#9a9da2', skyB: '#a8abb0', g1: '#5f6f5f', g2: '#5a695a', road: '#6a6a6a',
    e1: '#d0d0d0', e2: '#a0a0a0', m1: '#9a9da2', m2: '#a3a6ab', cl: '#b0b3b8', cs: '#9a9da2',
    night: 0, fog: 1, snow: 0, mist: 0, cloud: 0 },
  { name: 'AMANHECER', dur: 30, sun: { x: 0.34, e0: -0.2, e1: 0.9 },
    skyT: '#34509a', skyM: '#d88ab0', skyB: '#ffd2a0', g1: '#3a7a44', g2: '#34703e', road: '#6a6670',
    e1: '#ffffff', e2: '#d04a4a', m1: '#4a4a6a', m2: '#9a7aa8', cl: '#ffe0c8', cs: '#b070a0',
    night: 0, fog: 0, snow: 0, mist: 0.45, cloud: 0.9 },
];
// Chuva: ocupa o lugar da neve nos dias fora da serra (mesma duração)
const RAIN_PHASE = {
  name: 'CHUVA', dur: 25, skyT: '#3a414c', skyM: '#555d69', skyB: '#737b86', g1: '#2f5a34', g2: '#2b532f', road: '#3e4146',
  e1: '#d8d8d8', e2: '#b03a3a', m1: '#3c4a4a', m2: '#56606a', cl: '#6a727c', cs: '#454c56',
  night: 0, fog: 0, snow: 0, mist: 0, rain: 1, cloud: 1,
};
const PHASES_RAIN = PHASES.map(p => (p.name === 'NEVE' ? RAIN_PHASE : p));

const COLOR_KEYS = ['skyT', 'skyM', 'skyB', 'g1', 'g2', 'road', 'e1', 'e2', 'm1', 'm2', 'cl', 'cs'];
const NUM_KEYS = ['night', 'fog', 'snow', 'mist', 'cloud', 'rain'];
const BLEND = 4;                    // transição padrão entre fases (s)
const DAY_LEN = PHASES.reduce((s, p) => s + p.dur, 0);
for (const ph of [...PHASES, RAIN_PHASE]) {
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
// Cada dia tem uma paisagem (em ciclo). weather: o que ocupa a 2ª fase do dia (neve ou chuva).
// layers: objetos da beira da estrada; cada camada é sorteada por "vaga" (a cada PROP_GAP) e por lado.
//   chance: probabilidade por vaga; x: distância da pista [mín, máx] em faixas; every: só a cada N vagas
const PROP_GAP = 40;
const THEMES = [
  { name: 'SERRA', weather: 'snow', horizon: 'mountains', tint: null,
    layers: [
      { chance: 0.55, x: [1.8, 3.4], types: [['arvore', 4], ['araucaria', 4]] },
      { chance: 0.05, x: [1.8, 1.9], types: [['placa', 2], ['outdoor', 1]] },
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
];
const themeOfDay = day => (day - 1) % THEMES.length;
const phasesOf = idx => (THEMES[idx].weather === 'rain' ? PHASES_RAIN : PHASES);

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
const RIDGE_FAR = makeRidge(16, 10, 1.3);
const RIDGE_NEAR = makeRidge(8, 7, 4.1);
const STARS = Array.from({ length: 40 }, () => [(Math.random() * W) | 0, (Math.random() * (HORIZON - 20)) | 0]);
// Flocos com profundidade z (0.25 = longe/pequeno, 1 = perto/grande)
const FLAKES = Array.from({ length: 150 }, () => {
  const x = rand(0, W), y = rand(0, VIEW_H);
  return { x, y, px: x, py: y, z: rand(0.25, 1) };
});
const SPRAY = [];                   // neve levantada pelos pneus

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
  // paisagem: índice atual, fronteiras no mundo (objetos) e transição do horizonte
  themeIdx: 0, themeBounds: [{ z: -Infinity, idx: 0 }], horizonPrev: null, horizonT: 1,
  flash: 0, boltT: 6, bolt: null,
  goalIdx: loadGoalIdx(), records: loadRecords(), newRecord: false,
};

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
  Object.assign(G, {
    state: 'playing', pos: 0, speed: 0, x: 0, vx: 0, crashT: 0,
    curve: 0, curveTarget: 0, segLeft: 900, bgX: 0,
    t: 0, dayEnd: DAY_LEN, day: 1, carsLeft: dayGoal(1), goalMet: false, passed: 0, runT: 0,
    cars: [], spawnT: 1, newRecord: false,
    themeIdx: 0, themeBounds: [{ z: -Infinity, idx: 0 }], horizonPrev: null, horizonT: 1, flash: 0, boltT: 6,
  });
  SPRAY.length = 0;
  showBanner(`DIA 1 - ${THEMES[0].name}`, 2.5);
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
  const idx = themeOfDay(G.day);
  G.themeBounds = [G.themeBounds[G.themeBounds.length - 1], { z: G.pos + SPAWN_DIST + 200, idx }];
  G.horizonPrev = G.themeIdx;
  G.themeIdx = idx;
  G.horizonT = 0;
  showBanner(`DIA ${G.day} - ${THEMES[idx].name}`, 3);
  Sound.jingle();
}

// ================= Entrada =================
const keys = {};
const touch = { left: false, right: false, gas: false, brake: false };
const input = {
  get left() { return keys.ArrowLeft || keys.KeyA || touch.left || Pad.act.left; },
  get right() { return keys.ArrowRight || keys.KeyD || touch.right || Pad.act.right; },
  get gas() { return keys.ArrowUp || keys.KeyW || keys.Space || keys.KeyZ || touch.gas || Pad.act.accel || Pad.act.up; },
  get brake() { return keys.ArrowDown || keys.KeyS || keys.KeyX || touch.brake || Pad.act.brake || Pad.act.down; },
};

addEventListener('keydown', e => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
  if (!keys[e.code]) onKeyPress(e.code);
  keys[e.code] = true;
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => {
  for (const k in keys) keys[k] = false;
  if (G.state === 'playing') G.state = 'paused';
});

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
  } else if (G.state === 'paused') G.state = 'playing';
  else if (G.state === 'gameover') G.state = 'menu';
}
function readTouches(e) {
  touch.left = touch.right = touch.gas = touch.brake = false;
  for (const t of e.touches) {
    const fx = canvasFx(t.clientX);
    if (fx < 0.33) { touch.left = true; touch.gas = true; }
    else if (fx > 0.67) { touch.right = true; touch.gas = true; }
    else touch.brake = true;
  }
}
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const t = e.changedTouches[0];
  if (G.state !== 'playing') onTap(canvasFx(t.clientX), canvasFy(t.clientY));
  else readTouches(e);
}, { passive: false });
canvas.addEventListener('touchmove', e => { e.preventDefault(); if (G.state === 'playing') readTouches(e); }, { passive: false });
canvas.addEventListener('touchend', e => { e.preventDefault(); readTouches(e); }, { passive: false });
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
    updateFlakes(dt);
    updateRain(dt);
    updateSpray(dt);
  }
  if (G.state === 'playing' && G.env.name !== G.lastPhase) {
    if (G.env.name === 'NEVE') showBanner('NEVE! PISTA ESCORREGADIA', 2.5);
    if (G.env.name === 'CHUVA') showBanner('CHUVA! PISTA MOLHADA', 2.5);
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
    const a = 190 * car.accel * (1 - 0.55 * G.speed / top) * (env.snow > 0.5 ? 0.8 : 1);
    G.speed += a * dt;
  } else {
    G.speed -= 70 * dt;
  }
  if (offroad) {
    const lim = top * 0.4;
    if (G.speed > lim) G.speed = Math.max(lim, G.speed - 500 * dt);
  }
  G.speed = clamp(G.speed, 0, top);

  // Direção: a neve reduz a aderência (a Kombi, mais pesada, sofre menos)
  const sr = G.speed / (130 * KMH);
  const grip = 1 - env.snow * clamp(0.75 - 0.35 * (car.mass - 1), 0.3, 0.85)
                - env.rain * clamp(0.35 - 0.15 * (car.mass - 1), 0.15, 0.45);
  const steerPow = 1.7 * car.handling * (0.35 + 0.65 * Math.min(1, G.speed / 250));
  const targetVx = G.crashT > 0 ? 0 : steer * steerPow;
  const rate = G.crashT > 0 ? 3 : 9 * grip;
  G.vx += (targetVx - G.vx) * Math.min(1, dt * rate);
  G.x += G.vx * dt;
  G.x -= (G.curve * sr * sr * 0.6 / Math.sqrt(car.mass)) * dt;   // força centrífuga
  G.x = clamp(G.x, -1.5, 1.5);

  updateTrack(G.speed * dt);

  // Relógio do dia
  G.t += dt;
  if (G.t >= G.dayEnd) {
    endOfDay();
    if (G.state !== 'playing') return;
  }

  updateOpponents(dt);

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

function updateFlakes(dt) {
  if (G.env.snow <= 0.01) return;
  // Os flocos se afastam do ponto de fuga conforme a velocidade: parecem vir na direção da câmera
  const vx0 = W / 2 + curveOff(0), vy0 = HORIZON - 10;
  const rush = G.speed * 0.0022;
  const wind = 18 * Math.sin(G.clock * 0.35) + 10 * Math.sin(G.clock * 1.3) - G.curve * G.speed * 0.04;
  for (const f of FLAKES) {
    const k = rush * f.z;
    f.px = f.x; f.py = f.y;
    f.x += ((f.x - vx0) * k + wind * f.z + Math.sin(G.clock * 2 + f.z * 40) * 6) * dt;
    f.y += ((f.y - vy0) * k + 12 + 40 * f.z) * dt;
    if (f.y > VIEW_H + 4 || f.x < -4 || f.x > W + 4) {
      if (G.speed > 250 && Math.random() < 0.7) { f.x = vx0 + rand(-90, 90); f.y = rand(0, HORIZON + 40); }
      else { f.x = rand(0, W); f.y = -2; }
      f.z = rand(0.25, 1);
      f.px = f.x; f.py = f.y;
    }
  }
}

// Chuva: gotas rápidas e inclinadas que, como os flocos, "vêm" na direção da câmera com a velocidade
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

function updateSpray(dt) {
  const env = G.env;
  const wet = Math.max(env.snow, env.rain);
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
        t: 0, life: rand(0.35, 0.7), big: Math.random() < 0.3, water: env.rain > env.snow,
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

// Cor do chão tingida pela paisagem (areia no litoral, concreto na cidade...); some à noite e na neve
function tintGround(c, env, idx) {
  const t = THEMES[idx].tint;
  return t ? lerpRgb(c, t[0], t[1] * (1 - env.night) * (1 - env.snow)) : c;
}

const LANE_LINES = [-0.31, 0.31];     // divisórias entre as três faixas

function drawRoad(env) {
  const rgb = env.rgb;
  // Na troca de paisagem, o tom do chão acompanha a transição do horizonte
  const prev = G.horizonPrev !== null && G.horizonT < 1 ? G.horizonPrev : G.themeIdx;
  const ground = ['g1', 'g2'].map(k =>
    lerpRgb(tintGround(rgb[k], env, prev), tintGround(rgb[k], env, G.themeIdx), G.horizonT));
  const groundCss = ground.map(rgbStr);
  const lane = lerpRgb(rgb.road, [236, 236, 228], 0.75 * (1 - env.snow * 0.85));
  const laneCss = rgbStr(lane);

  for (let y = HORIZON; y < VIEW_H; y++) {
    const p = (y - HORIZON + 0.5) / ROAD_ROWS;
    const dist = CAM_D / p;
    const half = ROAD_HALF * p;
    const cx = W / 2 + curveOff(p);
    const s = Math.floor((G.pos + dist) / STRIPE) & 1;
    const f = fogAt(dist, env);
    const fogged = f > 0.004;
    const col = fogged ? (key => fogMix(rgb[key], f)) : (key => env[key]);
    ctx.fillStyle = fogged ? fogMix(ground[s ? 0 : 1], f) : groundCss[s ? 0 : 1];
    ctx.fillRect(0, y, W, 1);
    const l = Math.round(cx - half), r = Math.round(cx + half);
    ctx.fillStyle = col('road');
    ctx.fillRect(l, y, r - l, 1);
    const ew = Math.max(1, Math.round(half * 0.07));
    ctx.fillStyle = col(s ? 'e1' : 'e2');
    ctx.fillRect(l - ew, y, ew, 1);
    ctx.fillRect(r, y, ew, 1);

    // Faixas pontilhadas entre as pistas
    if (Math.floor((G.pos + dist) / 18) % 3 === 0) {
      const lw = Math.max(1, Math.round(half * 0.02));
      ctx.fillStyle = fogged ? fogMix(lane, f) : laneCss;
      for (const b of LANE_LINES) ctx.fillRect(Math.round(cx + b * half - lw / 2), y, lw, 1);
    }

    if (env.snow > 0.01) drawSnowyRow(env, y, dist, half, cx, f);
  }
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
  const a = themeWeight(idx) * (1 - env.rain) * (1 - env.night) * (1 - env.fog) * (1 - env.snow);
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
  if (kind === 'mountains') {
    drawRidge(RIDGE_FAR, G.bgX * 0.5, c2);
    drawRidge(RIDGE_NEAR, G.bgX, c1);
  } else if (kind === 'hills') {
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
  const n = env.night, f = fogAt(o.d, env);

  if (n < 0.99) ctx.drawImage(base, sx, sy, rw, rh);
  if (n > 0.01) {
    ctx.globalAlpha = n;
    ctx.drawImage(getProp(o.prop, 'night', o.flip), sx, sy, rw, rh);
  }
  if (env.snow > 0.01) {
    ctx.globalAlpha = env.snow;
    ctx.drawImage(getProp(o.prop, 'snowcap', o.flip), sx, sy, rw, rh);
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

// Pista nevada: manchas de neve acumulada e trilhas escuras de pneu em cada faixa
function drawSnowyRow(env, y, dist, half, cx, f) {
  const z = G.pos + dist, sn = env.snow;
  const k = Math.floor(z / 40);
  if (hash(k) > 0.5) {
    const x0 = hash(k + 7) * 1.8 - 0.9, w = 0.2 + hash(k + 9) * 0.5;
    ctx.fillStyle = fogMix(lerpRgb(env.rgb.road, SNOW_RGB, sn * 0.85), f);
    ctx.fillRect(Math.round(cx + x0 * half), y, Math.max(1, Math.round(w * half)), 1);
  }
  const tw = Math.max(1, Math.round(half * 0.05));
  ctx.fillStyle = fogMix(lerpRgb(env.rgb.road, mulRgb(env.rgb.road, 0.6), sn), f);
  for (let i = 0; i < LANES.length; i++) {
    const wob = 0.03 * Math.sin(z * 0.01 + i * 2);
    for (const o of [-0.14, 0.14]) {
      ctx.fillRect(Math.round(cx + (LANES[i] + o + wob) * half - tw / 2), y, tw, 1);
    }
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
// Na neve há uma névoa branca mais leve; o mesmo sistema cuida das duas
const SNOW_RGB = [232, 237, 245];
const SNOW_HEX = '#e8edf5';
let hazeRGB = FOG_RGB, hazeHex = FOG_HEX;
// Neblina rosada baixa do amanhecer
const MIST_RGB = [238, 204, 214];
const MIST_HEX = '#eeccd6';
// Chuva: névoa cinza-azulada leve
const RAIN_RGB = [118, 126, 138];
const RAIN_HEX = '#767e8a';
const hazeAmt = env => Math.max(env.fog, env.snow * 0.5, env.mist, env.rain * 0.3);
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
    drawSnowCap(c.model, c.color, sx, sy, rw, rh, env);
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
  const rough = G.crashT > 0 || (Math.abs(G.x) > OFFROAD_X && G.speed > 50);
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
  drawSnowCap(G.car.id, G.car.color, sx, sy, dw, dh, env);
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

// Camada de neve acumulada no teto do carro
function drawSnowCap(model, color, sx, sy, w, h, env) {
  if (env.snow <= 0.01) return;
  ctx.globalAlpha = env.snow;
  ctx.drawImage(getSprite(model, color, 'snowcap'), sx, sy, w, h);
  ctx.globalAlpha = 1;
}

function drawSpray(env) {
  for (const s of SPRAY) {
    ctx.fillStyle = s.water ? `rgba(185,198,215,${(1 - s.t / s.life) * 0.7})` : `rgba(245,248,255,${(1 - s.t / s.life) * 0.9})`;
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

// Flocos: pontos quando devagar, riscos quando em alta velocidade
function drawSnow(env) {
  ctx.lineCap = 'square';
  for (const [near, width, alpha] of [[false, 1, 0.65], [true, 2, 0.95]]) {
    ctx.strokeStyle = `rgba(255,255,255,${alpha * env.snow})`;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (const f of FLAKES) {
      if ((f.z > 0.75) !== near) continue;
      ctx.moveTo(f.px, f.py);
      ctx.lineTo(f.x, f.y + 0.5);
    }
    ctx.stroke();
  }
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

  if (blink) text('<>CARRO ^vCOR -+META ENTER:CORRER', W / 2, 214, '#ff9a2a', 8, 'center');
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
  const playing = G.state !== 'menu' && G.state !== 'padconfig';

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, VIEW_H);
  ctx.clip();

  const fog = env.fog > 0.01;
  const haze = hazeAmt(env);
  // A névoa que domina define a cor: neblina cinza, neve branca ou bruma rosada
  [, hazeRGB, hazeHex] = [[env.fog, FOG_RGB, FOG_HEX], [env.snow * 0.5, SNOW_RGB, SNOW_HEX], [env.mist, MIST_RGB, MIST_HEX], [env.rain * 0.3, RAIN_RGB, RAIN_HEX]]
    .reduce((best, h) => (h[0] > best[0] ? h : best));
  updateFogVis();
  drawSky(env);
  if (haze > 0.01) {
    ctx.fillStyle = `rgba(${hazeRGB},${0.9 * env.fog + 0.35 * env.snow})`;
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
  if (env.sun) drawSunGlare(env);
  if (env.night > 0.01) drawNightOverlay(env);

  // Carros, objetos da estrada e nuvens de neblina ordenados por profundidade (de longe para perto)
  const items = playing ? G.cars.map(c => ({ c, d: c.z - G.pos })).filter(o => o.d > 1) : [];
  items.push(...roadsideProps());
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
  if (env.snow > 0.01) drawSnow(env);
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
    drawOverlay('PAUSADO', '#ffd24a', [['P, ENTER OU START: CONTINUAR', '#ffffff'], ['ESC OU SELECT: MENU', '#aaaaaa']]);
  } else if (G.state === 'gameover') {
    const lines = [
      [`VOCÊ CHEGOU AO DIA ${G.day}`, '#ffffff'],
      [`${odoKm().toFixed(1)} KM PERCORRIDOS`, '#ffffff'],
      [`FALTARAM ${G.carsLeft} CARROS`, '#ffd24a'],
      [`${G.passed} ULTRAPASSAGENS`, '#9fe07a'],
    ];
    lines.push([G.newRecord && blink ? 'NOVO RECORDE!' : '', '#ff9a2a']);
    lines.push([blink ? 'ENTER: VOLTAR AO MENU' : '', '#aaaaaa']);
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
