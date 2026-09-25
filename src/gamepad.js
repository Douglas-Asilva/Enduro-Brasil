'use strict';
/* Suporte a controle via Gamepad API, pensado para controles USB estilo Super Nintendo.
   Cada ação tem uma lista de "binds"; basta um estar ativo:
     { b: i }        botão i
     { a: i, s: ±1 } eixo i passando de 0.5 no sentido s (analógico ou direcional reportado como eixo)
     { h: i, d: dir } "hat" (direcional digital reportado como um único eixo; comum em genéricos no Windows) */

const PAD_ACTIONS = ['left', 'right', 'up', 'down', 'accel', 'brake', 'start', 'select', 'l', 'r'];
const PAD_LABELS = {
  left: 'ESQUERDA', right: 'DIREITA', up: 'CIMA', down: 'BAIXO',
  accel: 'ACELERAR (B)', brake: 'FREAR (Y)', start: 'START (PAUSA)', select: 'SELECT (VOLTAR)',
  l: 'L (META -)', r: 'R (META +)',
};

// Controles no padrão do navegador (Xbox, PlayStation, 8BitDo...). Botões na mesma posição física do SNES:
// 0 = baixo (B do SNES), 1 = direita (A), 2 = esquerda (Y), 3 = cima (X)
const PAD_STANDARD = {
  left: [{ b: 14 }, { a: 0, s: -1 }], right: [{ b: 15 }, { a: 0, s: 1 }],
  up: [{ b: 12 }, { a: 1, s: -1 }], down: [{ b: 13 }, { a: 1, s: 1 }],
  accel: [{ b: 0 }, { b: 1 }, { b: 7 }], brake: [{ b: 2 }, { b: 6 }],
  start: [{ b: 9 }], select: [{ b: 8 }], l: [{ b: 4 }], r: [{ b: 5 }],
};

// Genéricos USB estilo SNES (numeração mais comum): X=0 A=1 B=2 Y=3 L=4 R=5 Select=8 Start=9,
// direcional nos eixos 0/1 ou como "hat" no eixo 9
const PAD_GENERIC = {
  left: [{ a: 0, s: -1 }, { h: 9, d: 'left' }], right: [{ a: 0, s: 1 }, { h: 9, d: 'right' }],
  up: [{ a: 1, s: -1 }, { h: 9, d: 'up' }], down: [{ a: 1, s: 1 }, { h: 9, d: 'down' }],
  accel: [{ b: 2 }, { b: 1 }], brake: [{ b: 3 }],
  start: [{ b: 9 }], select: [{ b: 8 }], l: [{ b: 4 }], r: [{ b: 5 }],
};

// Hat: um eixo com 8 posições entre -1 e 1 (passos de 2/7); em repouso fica fora dessa faixa (~1.29)
const HAT_DIRS = [['up'], ['up', 'right'], ['right'], ['down', 'right'], ['down'], ['down', 'left'], ['left'], ['up', 'left']];
function hatDirs(v) {
  if (v === undefined || Math.abs(v) > 1.1) return [];
  return HAT_DIRS[Math.round((v + 1) * 3.5)] || [];
}

function readPad() {
  const list = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of list) if (gp && gp.connected) return gp;
  return null;
}
const btnDown = btn => !!btn && (btn.pressed || btn.value > 0.5);

const Pad = {
  id: null, act: {}, hatSeen: {}, custom: {}, cap: null,
  onChange: null,                   // chamado quando um controle conecta/desconecta

  loadCustom() {
    try { this.custom = JSON.parse(localStorage.getItem('enduro-br-pad')) || {}; } catch (e) { this.custom = {}; }
  },
  saveCustom() {
    try { localStorage.setItem('enduro-br-pad', JSON.stringify(this.custom)); } catch (e) { /* sem storage */ }
  },
  bindingsFor(gp) {
    return this.custom[gp.id] || (gp.mapping === 'standard' ? PAD_STANDARD : PAD_GENERIC);
  },
  hasCustom() { return !!(this.id && this.custom[this.id]); },
  resetCustom() {
    if (this.id) { delete this.custom[this.id]; this.saveCustom(); }
  },

  active(gp, b) {
    if (b.b !== undefined) return btnDown(gp.buttons[b.b]);
    if (b.a !== undefined) {
      const v = gp.axes[b.a];
      return v !== undefined && !this.hatSeen[b.a] && v * b.s > 0.5;
    }
    if (b.h !== undefined) return !!this.hatSeen[b.h] && hatDirs(gp.axes[b.h]).includes(b.d);
    return false;
  },

  // Lê o controle; atualiza Pad.act e devolve as ações recém-apertadas
  poll() {
    const gp = readPad();
    if (!gp) {
      if (this.id) { this.id = null; if (this.onChange) this.onChange(null); }
      this.act = {};
      return [];
    }
    if (gp.id !== this.id) {
      this.id = gp.id;
      this.hatSeen = {};
      if (this.onChange) this.onChange(gp);
    }
    gp.axes.forEach((v, i) => { if (Math.abs(v) > 1.1) this.hatSeen[i] = true; });
    const binds = this.bindingsFor(gp), act = {};
    for (const a of PAD_ACTIONS) act[a] = (binds[a] || []).some(b => this.active(gp, b));
    const pressed = PAD_ACTIONS.filter(a => act[a] && !this.act[a]);
    this.act = act;
    return pressed;
  },

  rumble(ms, strength) {
    const gp = readPad(), va = gp && gp.vibrationActuator;
    if (!va || !va.playEffect) return;
    try {
      va.playEffect('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: strength * 0.6 })
        .catch(() => {});
    } catch (e) { /* controle sem vibração */ }
  },

  // ---- Configuração: pede cada ação em sequência e grava o botão/direção apertado ----
  startCapture() { this.cap = { step: 0, binds: {}, wait: true, rest: null }; },
  captureAction() { return this.cap ? PAD_ACTIONS[this.cap.step] : null; },

  // Devolve 'done' quando a última ação é gravada
  captureTick() {
    const cap = this.cap, gp = readPad();
    if (!cap || !gp) return null;
    const pressedBtn = gp.buttons.findIndex(btnDown);
    // Posição de repouso dos eixos (há gatilhos que descansam em -1)
    if (!cap.rest) {
      if (pressedBtn < 0) cap.rest = gp.axes.slice();
      return null;
    }
    const axisMoved = (v, i) => Math.abs(v - (cap.rest[i] || 0)) > 0.6 && Math.abs(v) > 0.5;
    if (cap.wait) {
      // Só aceita a próxima entrada depois que tudo for solto
      const idle = pressedBtn < 0 && gp.axes.every((v, i) => (this.hatSeen[i] ? !hatDirs(v).length : !axisMoved(v, i)));
      if (idle) cap.wait = false;
      return null;
    }
    const want = PAD_ACTIONS[cap.step];
    let bind = null;
    if (pressedBtn >= 0) {
      bind = { b: pressedBtn };
    } else {
      for (let i = 0; i < gp.axes.length && !bind; i++) {
        const v = gp.axes[i];
        if (this.hatSeen[i]) {
          const d = hatDirs(v);
          if (d.length) bind = { h: i, d: d.includes(want) ? want : d[0] };
        } else if (axisMoved(v, i)) {
          bind = { a: i, s: Math.sign(v - (cap.rest[i] || 0)) };
        }
      }
    }
    if (!bind) return null;
    cap.binds[want] = [bind];
    cap.step++;
    cap.wait = true;
    Sound.beep(620 + cap.step * 40, 0.07);
    if (cap.step < PAD_ACTIONS.length) return null;
    this.custom[gp.id] = cap.binds;
    this.saveCustom();
    this.cap = null;
    return 'done';
  },
};
Pad.loadCustom();
