import dartUrl from "@/assets/sprites/dart.png";
import cruiserUrl from "@/assets/sprites/cruiser.png";
import playerUrl from "@/assets/sprites/player.png";
import weaverUrl from "@/assets/sprites/weaver.png";
import { getSfx } from "@/game/audio";
import { moveVector, radialDeadzone } from "@/game/motion";
import {
  loadScores,
  loadSettings,
  sanitizeName,
  saveSettings,
  upsertScore,
  type ScoreEntry,
  type Settings,
} from "@/game/scores";

export type Phase = "menu" | "play" | "pause" | "over";
export type PowerKind = "multi" | "shield" | "boost";

export type Hud = {
  phase: Phase;
  score: number;
  best: number;
  wave: number;
  left: number;
  hp: number;
  maxHp: number;
  multi: number;
  multiT: number;
  shieldT: number;
  boostT: number;
  combo: number;
  banner: string;
  scores: ScoreEntry[];
  pilot: string;
  scoreAt: number;
  record: boolean;
  shakeOn: boolean;
  muted: boolean;
  finalWave: number;
};

export type GameApi = {
  destroy: () => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  toMenu: () => void;
  toggleMute: () => void;
  toggleShake: () => void;
  submitScore: (name: string) => void;
};

const MAX_HP = 5;
const BASE_SPEED = 340;
const STEP = 1 / 60;
const MULTI_TIME = 14;
const SHIELD_TIME = 10;
const BOOST_TIME = 9;

export const INITIAL_HUD: Hud = {
  phase: "menu",
  score: 0,
  best: 0,
  wave: 1,
  left: 0,
  hp: MAX_HP,
  maxHp: MAX_HP,
  multi: 1,
  multiT: 0,
  shieldT: 0,
  boostT: 0,
  combo: 0,
  banner: "",
  scores: [],
  pilot: "雅静",
  scoreAt: 0,
  record: false,
  shakeOn: true,
  muted: false,
  finalWave: 1,
};

type EnemyType = "dart" | "weaver" | "cruiser";

type Bullet = {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  friendly: boolean;
  r: number;
  life: number;
};

type Enemy = {
  alive: boolean;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  r: number;
  flash: number;
  fireCd: number;
  phase: number;
  t: number;
  origin: number;
};

type Pickup = {
  alive: boolean;
  kind: PowerKind;
  x: number;
  y: number;
  life: number;
  r: number;
};

type Particle = {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  radius: number;
  color: string;
};

type Flash = { alive: boolean; x: number; y: number; aim: number; life: number; max: number };
type Ring = { alive: boolean; x: number; y: number; life: number; max: number };
type Popup = { alive: boolean; x: number; y: number; life: number; text: string; color: string };
type Star = { x: number; y: number; z: number; s: number; tw: number };

const SCORE: Record<EnemyType, number> = { dart: 100, weaver: 160, cruiser: 700 };

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function angDiff(from: number, to: number) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function makePool<T>(n: number, create: () => T): T[] {
  return Array.from({ length: n }, create);
}

function take<T extends { alive: boolean }>(pool: T[]): T | null {
  for (const item of pool) if (!item.alive) return item;
  return null;
}

function loadSprite(url: string) {
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  return img;
}

export function createGame(canvas: HTMLCanvasElement, onHud: (hud: Hud) => void): GameApi {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法创建画布");
  const ctx: CanvasRenderingContext2D = context;

  const sfx = getSfx();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let settings: Settings = loadSettings();
  let scores = loadScores();
  let shakeOn = settings.shake === null ? !reduce : settings.shake;
  let muted = settings.muted;
  sfx.muted = muted;

  const sprites = {
    player: loadSprite(playerUrl),
    dart: loadSprite(dartUrl),
    weaver: loadSprite(weaverUrl),
    cruiser: loadSprite(cruiserUrl),
  };

  const keys = new Set<string>();
  let inject: Set<string> | null = null;
  let steerLock: number | null = null;
  let pointerFresh = false;
  let pointerId: number | null = null;
  const pointer = { x: 0, y: 0, type: "mouse" };

  let w = 1;
  let h = 1;
  let dpr = 1;
  let phase: Phase = "menu";
  let clock = 0;
  let acc = 0;
  let hitstop = 0;
  let trauma = 0;
  let raf = 0;
  let last = performance.now();
  let lastHud = 0;
  let shots = 0;

  let score = 0;
  let wave = 1;
  let toSpawn = 0;
  let spawnCd = 0;
  let waveBreak = 0;
  let banner = "";
  let bannerT = 0;
  let combo = 0;
  let comboT = 0;
  let scoreAt = 0;
  let dead = false;
  let deadT = 0;
  let engineCd = 0;

  const player = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    aim: -Math.PI / 2,
    hp: MAX_HP,
    iframes: 0,
    fireCd: 0,
    multi: 1,
    multiT: 0,
    shieldT: 0,
    boostT: 0,
    flash: 0,
    r: 16,
  };

  const bullets = makePool<Bullet>(180, () => ({
    alive: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    friendly: true,
    r: 4,
    life: 0,
  }));
  const enemies = makePool<Enemy>(28, () => ({
    alive: false,
    type: "dart",
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    hp: 1,
    maxHp: 1,
    r: 16,
    flash: 0,
    fireCd: 1,
    phase: 0,
    t: 0,
    origin: 0,
  }));
  const pickups = makePool<Pickup>(12, () => ({
    alive: false,
    kind: "multi",
    x: 0,
    y: 0,
    life: 12,
    r: 16,
  }));
  const particles = makePool<Particle>(240, () => ({
    alive: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    max: 1,
    radius: 2,
    color: "#2ad4ff",
  }));
  const flashes = makePool<Flash>(16, () => ({
    alive: false,
    x: 0,
    y: 0,
    aim: 0,
    life: 0,
    max: 0.07,
  }));
  const rings = makePool<Ring>(16, () => ({ alive: false, x: 0, y: 0, life: 0, max: 0.4 }));
  const popups = makePool<Popup>(24, () => ({
    alive: false,
    x: 0,
    y: 0,
    life: 0,
    text: "",
    color: "#ffb020",
  }));

  let stars: Star[] = [];
  const planet = { x: 0.78, y: -0.1, r: 86 };

  function bestScore() {
    return scores[0]?.score ?? 0;
  }

  function snapshot(): Hud {
    const alive = enemies.reduce((n, e) => n + (e.alive ? 1 : 0), 0);
    return {
      phase,
      score,
      best: bestScore(),
      wave,
      left: toSpawn + alive,
      hp: player.hp,
      maxHp: MAX_HP,
      multi: player.multi,
      multiT: player.multiT,
      shieldT: player.shieldT,
      boostT: player.boostT,
      combo,
      banner: bannerT > 0 ? banner : "",
      scores,
      pilot: settings.name,
      scoreAt,
      record: score > bestScore() && score > 0,
      shakeOn,
      muted,
      finalWave: wave,
    };
  }

  function pushHud(force = false) {
    const now = performance.now();
    if (!force && now - lastHud < 100) return;
    lastHud = now;
    onHud(snapshot());
  }

  function persistSettings() {
    settings = { ...settings, muted, shake: shakeOn };
    saveSettings(settings);
  }

  function killPools() {
    for (const b of bullets) b.alive = false;
    for (const e of enemies) e.alive = false;
    for (const p of pickups) p.alive = false;
    for (const p of particles) p.alive = false;
    for (const f of flashes) f.alive = false;
    for (const r of rings) r.alive = false;
    for (const p of popups) p.alive = false;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = Math.max(1, rect.width);
    h = Math.max(1, rect.height);
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    const count = w * h < 420 * 720 ? 70 : 120;
    if (stars.length !== count) {
      stars = Array.from({ length: count }, () => ({
        x: Math.random(),
        y: Math.random(),
        z: Math.random() < 0.55 ? 0 : Math.random() < 0.7 ? 1 : 2,
        s: Math.random(),
        tw: Math.random() * Math.PI * 2,
      }));
    }
  }

  function popup(x: number, y: number, text: string, color: string) {
    const p = take(popups);
    if (!p) return;
    p.alive = true;
    p.x = x;
    p.y = y;
    p.text = text;
    p.color = color;
    p.life = 0.7;
  }

  function burst(x: number, y: number, n: number, color: string) {
    for (let i = 0; i < n; i++) {
      const p = take(particles);
      if (!p) return;
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 220;
      p.alive = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s;
      p.life = 0.35 + Math.random() * 0.35;
      p.max = p.life;
      p.radius = 1.5 + Math.random() * 2.4;
      p.color = color;
    }
    const ring = take(rings);
    if (ring) {
      ring.alive = true;
      ring.x = x;
      ring.y = y;
      ring.life = 0.38;
      ring.max = 0.38;
    }
  }

  function spawnBullet(x: number, y: number, vx: number, vy: number, friendly: boolean) {
    const b = take(bullets);
    if (!b) return;
    b.alive = true;
    b.x = x;
    b.y = y;
    b.vx = vx;
    b.vy = vy;
    b.friendly = friendly;
    b.r = friendly ? 4.5 : 6;
    b.life = friendly ? 1.15 : 3.2;
  }

  function muzzle(x: number, y: number, aim: number) {
    const f = take(flashes);
    if (!f) return;
    f.alive = true;
    f.x = x;
    f.y = y;
    f.aim = aim;
    f.life = 0.07;
    f.max = 0.07;
  }

  function spawnPickup(x: number, y: number, kind: PowerKind) {
    const p = take(pickups);
    if (!p) return;
    p.alive = true;
    p.kind = kind;
    p.x = x;
    p.y = y;
    p.life = 12;
    p.r = 16;
  }

  function rollEnemy(current: number): EnemyType {
    const r = Math.random();
    if (current >= 4 && r < Math.min(0.22, 0.08 + current * 0.012)) return "cruiser";
    if (current >= 2 && r < 0.5) return "weaver";
    return "dart";
  }

  function spawnEnemy(type: EnemyType) {
    if (enemies.reduce((n, e) => n + (e.alive ? 1 : 0), 0) >= 14) return false;
    const e = take(enemies);
    if (!e) return false;
    e.alive = true;
    e.type = type;
    e.r = type === "cruiser" ? 34 : type === "weaver" ? 20 : 15;
    e.x = e.r + 16 + Math.random() * Math.max(20, w - e.r * 2 - 32);
    e.y = -e.r - 16;
    e.origin = e.x;
    e.t = 0;
    e.phase = Math.random() * Math.PI * 2;
    e.flash = 0;
    e.fireCd = 0.8 + Math.random() * 0.8;
    const bonus = Math.floor((wave - 1) / 4);
    e.maxHp = type === "cruiser" ? 8 + wave : type === "weaver" ? 2 + bonus : 1 + Math.floor(bonus / 2);
    e.hp = e.maxHp;
    e.vx = 0;
    e.vy = 0;
    return true;
  }

  function beginWave(n: number) {
    wave = n;
    toSpawn = 6 + n * 2;
    spawnCd = 1.05;
    waveBreak = 0;
    banner = `第 ${n} 波`;
    bannerT = 1.7;
    const kinds: PowerKind[] = ["multi", "shield", "boost"];
    const lane = 0.22 + ((n - 1) % 3) * 0.28;
    spawnPickup(w * lane, -24, kinds[(n - 1) % 3]);
    if (n > 1) sfx.wave();
    pushHud(true);
  }

  function applyPickup(kind: PowerKind) {
    if (kind === "multi") {
      player.multi = Math.min(3, player.multi + 1);
      player.multiT = MULTI_TIME;
      popup(player.x, player.y - 28, player.multi >= 3 ? "多重射击 MAX" : "多重射击", "#2ad4ff");
    } else if (kind === "shield") {
      player.shieldT = SHIELD_TIME;
      popup(player.x, player.y - 28, "护盾", "#2ad4ff");
    } else {
      player.boostT = BOOST_TIME;
      popup(player.x, player.y - 28, "加速", "#ffb020");
    }
    sfx.pickup();
    pushHud(true);
  }

  function killEnemy(e: Enemy) {
    e.alive = false;
    if (comboT > 0) combo = Math.min(8, combo + 1);
    else combo = 1;
    comboT = 1.55;
    const mult = Math.min(4, combo);
    const gain = SCORE[e.type] * mult;
    score += gain;
    popup(e.x, e.y, combo > 1 ? `+${gain} x${mult}` : `+${gain}`, "#ffb020");
    burst(e.x, e.y, e.type === "cruiser" ? 26 : 12, e.type === "dart" ? "#ffb020" : "#ffd27a");
    trauma = Math.min(1, trauma + (e.type === "cruiser" ? 0.55 : 0.3));
    hitstop = e.type === "cruiser" ? 0.055 : 0.03;
    sfx.explode();
    if (Math.random() < (e.type === "cruiser" ? 1 : 0.2)) {
      const kinds: PowerKind[] = ["multi", "shield", "boost"];
      spawnPickup(e.x, e.y, kinds[Math.floor(Math.random() * 3)]!);
    }
    pushHud(true);
  }

  function hurtPlayer() {
    if (dead || player.iframes > 0) return;
    if (player.shieldT > 0) {
      player.shieldT = Math.max(0, player.shieldT - 2.6);
      player.iframes = 0.22;
      trauma = Math.min(1, trauma + 0.22);
      sfx.shield();
      burst(player.x, player.y, 8, "#2ad4ff");
      pushHud(true);
      return;
    }
    if (player.multi > 1) {
      player.multi -= 1;
      player.multiT = Math.max(player.multiT, 6);
    }
    player.hp -= 1;
    player.iframes = 1.15;
    player.flash = 0.12;
    trauma = Math.min(1, trauma + 0.5);
    hitstop = 0.05;
    sfx.hurt();
    burst(player.x, player.y, 10, "#e7f4ff");
    if (player.hp <= 0) {
      dead = true;
      deadT = 0.9;
      player.hp = 0;
      burst(player.x, player.y, 36, "#ffb020");
      trauma = 1;
      hitstop = 0.08;
      sfx.explode();
    }
    pushHud(true);
  }

  function activeHeld() {
    return inject ?? keys;
  }

  function readMove() {
    const held = activeHeld();
    const key = moveVector(held);
    let x = key.x;
    let y = key.y;
    if (steerLock !== null) x += -steerLock;
    if (inject === null) {
      const pads = navigator.getGamepads?.();
      const pad = pads ? Array.from(pads).find((g) => g && g.connected && g.mapping === "standard") : null;
      if (pad) {
        const stick = radialDeadzone(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
        if (Math.hypot(stick.x, stick.y) > Math.hypot(x, y)) {
          x = stick.x;
          y = stick.y;
        }
      }
    }
    const m = Math.hypot(x, y);
    if (m > 1) {
      x /= m;
      y /= m;
    }
    return { x, y, mag: Math.min(1, m) };
  }

  function nearestEnemy() {
    let best: Enemy | null = null;
    let bestD = 740 * 740;
    for (const e of enemies) {
      if (!e.alive) continue;
      const d = (e.x - player.x) ** 2 + (e.y - player.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  function step(dt: number) {
    if (dead) {
      deadT -= dt;
      updateFx(dt);
      if (deadT <= 0) enterOver();
      return;
    }

    player.multiT = Math.max(0, player.multiT - dt);
    player.shieldT = Math.max(0, player.shieldT - dt);
    player.boostT = Math.max(0, player.boostT - dt);
    if (player.multiT <= 0) player.multi = 1;
    player.iframes = Math.max(0, player.iframes - dt);
    player.flash = Math.max(0, player.flash - dt);
    bannerT = Math.max(0, bannerT - dt);
    comboT = Math.max(0, comboT - dt);
    if (comboT <= 0) combo = 0;

    const speed = BASE_SPEED * (player.boostT > 0 ? 1.62 : 1);
    const move = readMove();
    const ignorePointer = inject !== null;
    if (move.mag > 0) {
      player.vx = move.x * speed;
      player.vy = move.y * speed;
      player.x += player.vx * dt;
      player.y += player.vy * dt;
    } else if (!ignorePointer && pointerFresh) {
      const ty = pointer.y + (pointer.type === "touch" ? -64 : 0);
      const dx = pointer.x - player.x;
      const dy = ty - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.8) {
        const k = 1 - Math.exp(-14 * dt);
        let mx = dx * k;
        let my = dy * k;
        const stepLen = Math.hypot(mx, my);
        const cap = speed * dt;
        if (stepLen > cap) {
          mx = (mx / stepLen) * cap;
          my = (my / stepLen) * cap;
        }
        player.x += mx;
        player.y += my;
        player.vx = mx / dt;
        player.vy = my / dt;
      } else {
        player.vx = 0;
        player.vy = 0;
      }
    } else {
      player.vx = 0;
      player.vy = 0;
    }
    player.x = clamp(player.x, 20, Math.max(20, w - 20));
    player.y = clamp(player.y, 20, Math.max(20, h - 20));

    const target = nearestEnemy();
    const desired = target ? Math.atan2(target.y - player.y, target.x - player.x) : -Math.PI / 2;
    player.aim += angDiff(player.aim, desired) * (1 - Math.exp(-10 * dt));

    player.fireCd -= dt;
    const interval = player.multi >= 3 ? 0.11 : player.multi === 2 ? 0.135 : 0.16;
    if (player.fireCd <= 0) {
      player.fireCd = interval;
      const spreads = player.multi >= 3 ? [-0.22, 0, 0.22] : player.multi === 2 ? [-0.12, 0.12] : [0];
      const nose = 34;
      const nx = player.x + Math.cos(player.aim) * nose;
      const ny = player.y + Math.sin(player.aim) * nose;
      for (const s of spreads) {
        const a = player.aim + s;
        spawnBullet(nx, ny, Math.cos(a) * 760, Math.sin(a) * 760, true);
      }
      muzzle(nx, ny, player.aim);
      shots += 1;
      sfx.shoot();
    }

    engineCd -= dt;
    if (engineCd <= 0) {
      engineCd = 0.03;
      const p = take(particles);
      if (p) {
        const a = player.aim + Math.PI;
        p.alive = true;
        p.x = player.x + Math.cos(a) * 24;
        p.y = player.y + Math.sin(a) * 24;
        p.vx = Math.cos(a) * 80 + (Math.random() - 0.5) * 30;
        p.vy = Math.sin(a) * 80 + (Math.random() - 0.5) * 30;
        p.life = 0.22;
        p.max = 0.22;
        p.radius = 2.2;
        p.color = player.boostT > 0 ? "#ffb020" : "#2ad4ff";
      }
    }

    if (waveBreak > 0) {
      waveBreak -= dt;
      if (waveBreak <= 0) beginWave(wave + 1);
    } else {
      spawnCd -= dt;
      if (spawnCd <= 0 && toSpawn > 0) {
        if (spawnEnemy(rollEnemy(wave))) {
          toSpawn -= 1;
          spawnCd = Math.max(0.28, 0.84 - wave * 0.045);
        } else spawnCd = 0.2;
      }
      const alive = enemies.some((e) => e.alive);
      if (toSpawn === 0 && !alive) {
        const bonus = 150 * wave;
        score += bonus;
        banner = `第 ${wave} 波肃清  +${bonus}`;
        bannerT = 1.6;
        waveBreak = 2;
        popup(w / 2, h * 0.33, `+${bonus}`, "#ffb020");
        sfx.wave();
        pushHud(true);
      }
    }

    for (const e of enemies) {
      if (!e.alive) continue;
      e.t += dt;
      e.flash = Math.max(0, e.flash - dt);
      const spd =
        (e.type === "cruiser" ? 52 : e.type === "weaver" ? 108 : 168) + Math.min(90, wave * 6);
      if (e.type === "weaver") {
        const amp = Math.min(120, w * 0.2);
        e.vx = Math.cos(e.t * 2.15 + e.phase) * amp * 2.15;
        e.vy = spd;
        e.x = e.origin + Math.sin(e.t * 2.15 + e.phase) * amp;
        e.y += e.vy * dt;
      } else if (e.type === "dart") {
        const home = wave >= 3 ? 70 : 0;
        const dx = player.x - e.x;
        e.vx = clamp(dx, -home, home);
        e.vy = spd;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
      } else {
        e.vx = Math.sin(e.t * 0.7 + e.phase) * 36;
        e.vy = spd;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
      }
      if (e.type !== "dart" && e.y > 10 && e.y < h * 0.92) {
        e.fireCd -= dt;
        if (e.fireCd <= 0) {
          e.fireCd = e.type === "cruiser" ? Math.max(0.72, 1.55 - wave * 0.04) : Math.max(1, 2.2 - wave * 0.06);
          const base = Math.atan2(player.y - e.y, player.x - e.x);
          const spreads = e.type === "cruiser" ? [-0.3, 0, 0.3] : [0];
          const sp = Math.min(360, 230 + wave * 8);
          for (const s of spreads) {
            const a = base + s;
            spawnBullet(e.x, e.y, Math.cos(a) * sp, Math.sin(a) * sp, false);
          }
        }
      }
      if (e.y > h + 80) e.alive = false;
    }

    for (let i = 0; i < enemies.length; i++) {
      const a = enemies[i]!;
      if (!a.alive) continue;
      for (let j = i + 1; j < enemies.length; j++) {
        const b = enemies[j]!;
        if (!b.alive) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const min = a.r + b.r + 6;
        const d = Math.hypot(dx, dy) || 0.001;
        if (d < min) {
          const overlap = (min - d) * 0.5;
          const px = (dx / d) * overlap;
          const py = (dy / d) * overlap;
          a.x -= px;
          a.y -= py;
          b.x += px;
          b.y += py;
          if (a.type === "weaver") a.origin -= px;
          if (b.type === "weaver") b.origin += px;
        }
      }
    }

    for (const b of bullets) {
      if (!b.alive) continue;
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.life <= 0 || b.x < -40 || b.y < -40 || b.x > w + 40 || b.y > h + 40) b.alive = false;
    }

    for (const b of bullets) {
      if (!b.alive || !b.friendly) continue;
      for (const e of enemies) {
        if (!e.alive) continue;
        const d = Math.hypot(b.x - e.x, b.y - e.y);
        if (d < b.r + e.r) {
          b.alive = false;
          e.hp -= 1;
          e.flash = 0.08;
          burst(b.x, b.y, 4, "#e7f4ff");
          if (e.hp <= 0) killEnemy(e);
          else sfx.hit();
          break;
        }
      }
    }

    for (const b of bullets) {
      if (!b.alive || b.friendly) continue;
      if (Math.hypot(b.x - player.x, b.y - player.y) < b.r + player.r) {
        b.alive = false;
        hurtPlayer();
      }
    }

    for (const e of enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.x - player.x, e.y - player.y) < e.r * 0.72 + player.r) {
        hurtPlayer();
        if (e.type !== "cruiser") {
          e.hp -= 2;
          e.flash = 0.1;
          if (e.hp <= 0) killEnemy(e);
        }
      }
    }

    for (const p of pickups) {
      if (!p.alive) continue;
      p.life -= dt;
      const dx = player.x - p.x;
      const dy = player.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 130 && dist > 0.1) {
        p.x += (dx / dist) * 240 * dt;
        p.y += (dy / dist) * 240 * dt;
      } else p.y += 42 * dt;
      if (dist < p.r + player.r + 6) {
        p.alive = false;
        applyPickup(p.kind);
      } else if (p.life <= 0 || p.y > h + 40) p.alive = false;
    }

    updateFx(dt);
  }

  function updateFx(dt: number) {
    for (const p of particles) {
      if (!p.alive) continue;
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
      if (p.life <= 0) p.alive = false;
    }
    for (const f of flashes) {
      if (!f.alive) continue;
      f.life -= dt;
      if (f.life <= 0) f.alive = false;
    }
    for (const r of rings) {
      if (!r.alive) continue;
      r.life -= dt;
      if (r.life <= 0) r.alive = false;
    }
    for (const p of popups) {
      if (!p.alive) continue;
      p.life -= dt;
      p.y -= 28 * dt;
      if (p.life <= 0) p.alive = false;
    }
  }

  function enterOver() {
    if (phase === "over") return;
    phase = "over";
    dead = false;
    scoreAt = Date.now();
    if (score > 0) scores = upsertScore({ name: settings.name, score, wave, at: scoreAt });
    pushHud(true);
  }

  function resetRun() {
    killPools();
    score = 0;
    combo = 0;
    comboT = 0;
    dead = false;
    deadT = 0;
    scoreAt = 0;
    player.hp = MAX_HP;
    player.iframes = 0;
    player.fireCd = 0.15;
    player.multi = 1;
    player.multiT = 0;
    player.shieldT = 0;
    player.boostT = 0;
    player.flash = 0;
    player.aim = -Math.PI / 2;
    player.vx = 0;
    player.vy = 0;
    player.x = w * 0.5;
    player.y = h * 0.72;
    shots = 0;
    hitstop = 0;
    beginWave(1);
  }

  function drawSprite(
    img: HTMLImageElement,
    x: number,
    y: number,
    height: number,
    rotation: number,
    flash: number,
  ) {
    if (!img.complete || img.naturalWidth === 0) return false;
    const aspect = img.width / img.height;
    const dw = height * aspect;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    if (flash > 0) ctx.filter = "brightness(2.6) saturate(0.2)";
    ctx.drawImage(img, -dw / 2, -height / 2, dw, height);
    ctx.filter = "none";
    ctx.restore();
    return true;
  }

  function drawFallbackShip(x: number, y: number, rot: number, scale: number, hostile: boolean) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(12, 12);
    ctx.lineTo(0, 6);
    ctx.lineTo(-12, 12);
    ctx.closePath();
    ctx.fillStyle = hostile ? "#ffb020" : "#2ad4ff";
    ctx.fill();
    ctx.restore();
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const shake = shakeOn ? trauma * trauma : 0;
    const ox = shake ? (Math.sin(clock * 47) * 0.5 + Math.sin(clock * 23)) * 10 * shake : 0;
    const oy = shake ? (Math.cos(clock * 41) * 0.5 + Math.sin(clock * 19)) * 10 * shake : 0;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#061018";
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(ox, oy);

    const neb = ctx.createRadialGradient(w * 0.2, h * 0.2, 10, w * 0.25, h * 0.3, w * 0.55);
    neb.addColorStop(0, "rgba(42,212,255,0.08)");
    neb.addColorStop(1, "rgba(42,212,255,0)");
    ctx.fillStyle = neb;
    ctx.fillRect(0, 0, w, h);
    const neb2 = ctx.createRadialGradient(w * 0.85, h * 0.7, 10, w * 0.8, h * 0.75, w * 0.4);
    neb2.addColorStop(0, "rgba(255,176,32,0.06)");
    neb2.addColorStop(1, "rgba(255,176,32,0)");
    ctx.fillStyle = neb2;
    ctx.fillRect(0, 0, w, h);

    const parallax = (player.x - w / 2) / Math.max(1, w);
    const speeds = [16, 48, 120];
    const py = ((clock * speeds[0]!) % (h + 200)) - 40;
    ctx.beginPath();
    ctx.fillStyle = "rgba(36,78,120,0.55)";
    ctx.arc(planet.x * w - parallax * 18, ((planet.y * h + py) % (h + 220)) - 80, planet.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.strokeStyle = "rgba(42,212,255,0.35)";
    ctx.lineWidth = 3;
    ctx.ellipse(
      planet.x * w - parallax * 18,
      ((planet.y * h + py) % (h + 220)) - 80,
      planet.r + 18,
      planet.r * 0.28,
      -0.4,
      0,
      Math.PI * 2,
    );
    ctx.stroke();

    for (const s of stars) {
      const layer = s.z;
      const spd = speeds[layer] ?? 30;
      const y = (s.y * h + clock * spd) % h;
      const x = s.x * w - parallax * (10 + layer * 22);
      const alpha = 0.35 + s.s * 0.65;
      ctx.globalAlpha = 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(clock * 2 + s.tw));
      ctx.fillStyle = layer === 2 ? "#e7f4ff" : layer === 1 ? "#8aa4c4" : "#23415f";
      if (layer === 2) {
        ctx.globalAlpha = alpha;
        ctx.fillRect(x, y, 1.6, 8 + s.s * 10);
      } else {
        ctx.globalAlpha = alpha * (layer === 0 ? 0.7 : 1);
        ctx.beginPath();
        ctx.arc(x, y, layer === 0 ? 0.8 : 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    for (const p of pickups) {
      if (!p.alive) continue;
      const bob = Math.sin(clock * 4 + p.x) * 3;
      drawPickup(p.x, p.y + bob, p.kind, p.life < 2 ? 0.45 + 0.55 * Math.sin(clock * 12) : 1);
    }

    for (const b of bullets) {
      if (!b.alive || b.friendly) continue;
      drawHostileBolt(b);
    }

    for (const e of enemies) {
      if (!e.alive) continue;
      const rot = Math.atan2(e.vy, e.vx) + Math.PI / 2;
      const height = e.type === "cruiser" ? 108 : e.type === "weaver" ? 62 : 48;
      const img = sprites[e.type];
      const drew = drawSprite(img, e.x, e.y, height, rot, e.flash);
      if (!drew) drawFallbackShip(e.x, e.y, rot, e.type === "cruiser" ? 2 : 1.1, true);
      if (e.maxHp > 1 && e.hp < e.maxHp) {
        const bw = e.r * 1.6;
        ctx.fillStyle = "#102033";
        ctx.fillRect(e.x - bw / 2, e.y - height * 0.55, bw, 4);
        ctx.fillStyle = "#ffb020";
        ctx.fillRect(e.x - bw / 2, e.y - height * 0.55, bw * (e.hp / e.maxHp), 4);
      }
    }

    const lock = phase === "play" && !dead ? nearestEnemy() : null;
    if (lock) drawLock(lock);

    for (const b of bullets) {
      if (!b.alive || !b.friendly) continue;
      drawFriendlyBolt(b);
    }

    for (const p of particles) {
      if (!p.alive) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const r of rings) {
      if (!r.alive) continue;
      const k = 1 - r.life / r.max;
      ctx.beginPath();
      ctx.strokeStyle = `rgba(231,244,255,${1 - k})`;
      ctx.lineWidth = 2;
      ctx.arc(r.x, r.y, 10 + k * 46, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (phase !== "over" && !dead) {
      const bob = phase === "menu" ? Math.sin(clock * 2) * 6 : 0;
      const wide = w > 860;
      const px = phase === "menu" ? (wide ? w * 0.8 : w * 0.5) : player.x;
      const pyShip = (phase === "menu" ? (wide ? h * 0.58 : h * 0.86) : player.y) + bob;
      const rot = (phase === "menu" ? -Math.PI / 2 : player.aim) + Math.PI / 2;
      const shipH = phase === "menu" && wide ? 168 : 78;
      const rear = player.aim + Math.PI;
      const ex = px + Math.cos(phase === "menu" ? Math.PI / 2 : rear) * 22;
      const ey = pyShip + Math.sin(phase === "menu" ? Math.PI / 2 : rear) * 22;
      const glow = ctx.createRadialGradient(ex, ey, 2, ex, ey, player.boostT > 0 ? 28 : 18);
      glow.addColorStop(0, player.boostT > 0 ? "rgba(255,176,32,0.9)" : "rgba(42,212,255,0.85)");
      glow.addColorStop(1, "rgba(42,212,255,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(ex, ey, player.boostT > 0 ? 28 : 18, 0, Math.PI * 2);
      ctx.fill();

      if (player.shieldT > 0 && phase === "play") {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(42,212,255,${0.45 + 0.35 * Math.sin(clock * 6)})`;
        ctx.lineWidth = 2;
        ctx.arc(px, pyShip, 32 + Math.sin(clock * 5) * 1.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      const blink = player.iframes > 0 && Math.sin(clock * 28) > 0;
      if (!blink || phase !== "play") {
        const drew = drawSprite(sprites.player, px, pyShip, shipH, rot, player.flash);
        if (!drew) drawFallbackShip(px, pyShip, rot, 1.4, false);
      }
    }

    for (const f of flashes) {
      if (!f.alive) continue;
      const k = f.life / f.max;
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.aim);
      ctx.globalAlpha = Math.min(1, k + 0.25);
      ctx.fillStyle = "#e7f4ff";
      ctx.beginPath();
      ctx.moveTo(26 * k + 6, 0);
      ctx.lineTo(-2, 8);
      ctx.lineTo(2, 0);
      ctx.lineTo(-2, -8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#2ad4ff";
      ctx.globalAlpha = k;
      ctx.beginPath();
      ctx.arc(0, 0, 12 * k + 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    ctx.font = '600 15px Orbitron, "Noto Sans SC", sans-serif';
    ctx.textAlign = "center";
    for (const p of popups) {
      if (!p.alive) continue;
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;

    if (bannerT > 0 && phase === "play") {
      ctx.globalAlpha = Math.min(1, bannerT);
      ctx.fillStyle = "#e7f4ff";
      ctx.font = '700 28px Orbitron, "Noto Sans SC", sans-serif';
      ctx.fillText(banner, w / 2, h * 0.28);
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.75);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    if (phase === "play" && player.hp === 1 && !dead) {
      ctx.fillStyle = `rgba(255,176,32,${0.08 + 0.06 * Math.sin(clock * 6)})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  function drawLock(e: Enemy) {
    const s = e.r + 10;
    ctx.strokeStyle = "rgba(42,212,255,0.85)";
    ctx.lineWidth = 1.5;
    const corners: Array<[number, number, number, number]> = [
      [-1, -1, 1, 0],
      [1, -1, -1, 0],
      [-1, 1, 1, 0],
      [1, 1, -1, 0],
    ];
    for (const [sx, sy] of corners) {
      const x = e.x + sx * s;
      const y = e.y + sy * s;
      ctx.beginPath();
      ctx.moveTo(x, y + sy * -8);
      ctx.lineTo(x, y);
      ctx.lineTo(x + sx * -10, y);
      ctx.stroke();
    }
  }

  function drawFriendlyBolt(b: Bullet) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.atan2(b.vy, b.vx));
    ctx.fillStyle = "#e7f4ff";
    ctx.fillRect(-10, -1.6, 16, 3.2);
    ctx.fillStyle = "#2ad4ff";
    ctx.fillRect(-6, -2.4, 10, 4.8);
    ctx.restore();
  }

  function drawHostileBolt(b: Bullet) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.atan2(b.vy, b.vx));
    ctx.fillStyle = "#ffb020";
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(0, 4.5);
    ctx.lineTo(-7, 0);
    ctx.lineTo(0, -4.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawPickup(x: number, y: number, kind: PowerKind, alpha: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(16,32,51,0.92)";
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = kind === "boost" ? "#ffb020" : "#2ad4ff";
    ctx.stroke();
    ctx.fillStyle = kind === "boost" ? "#ffb020" : "#2ad4ff";
    if (kind === "multi") {
      for (const ox of [-6, 0, 6]) {
        ctx.beginPath();
        ctx.moveTo(ox, -7);
        ctx.lineTo(ox + 3.2, 0);
        ctx.lineTo(ox, 7);
        ctx.lineTo(ox - 3.2, 0);
        ctx.closePath();
        ctx.fill();
      }
    } else if (kind === "shield") {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 3;
        const px = Math.cos(a) * 8;
        const py = Math.sin(a) * 8;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(-8, 2);
      ctx.lineTo(0, -7);
      ctx.lineTo(8, 2);
      ctx.lineTo(0, -1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += dt;
    trauma = Math.max(0, trauma - dt * 1.7);
    if (phase === "play" && hitstop > 0) {
      hitstop -= dt;
    } else if (phase === "play") {
      acc += dt;
      let guard = 0;
      while (acc >= STEP && guard < 5) {
        step(STEP);
        acc -= STEP;
        guard += 1;
      }
    } else acc = 0;
    if (w > 2) render();
    pushHud(false);
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (w < 8) resize();
    sfx.unlock();
    phase = "play";
    resetRun();
    pushHud(true);
  }

  function pause() {
    if (phase !== "play" || dead) return;
    phase = "pause";
    keys.clear();
    pointerFresh = false;
    pushHud(true);
  }

  function resume() {
    if (phase !== "pause") return;
    phase = "play";
    last = performance.now();
    pushHud(true);
  }

  function toMenu() {
    phase = "menu";
    dead = false;
    killPools();
    keys.clear();
    pushHud(true);
  }

  function toggleMute() {
    sfx.unlock();
    muted = !muted;
    sfx.muted = muted;
    persistSettings();
    pushHud(true);
  }

  function toggleShake() {
    shakeOn = !shakeOn;
    persistSettings();
    pushHud(true);
  }

  function submitScore(name: string) {
    settings = { ...settings, name: sanitizeName(name) };
    saveSettings(settings);
    if (score > 0) {
      if (!scoreAt) scoreAt = Date.now();
      scores = upsertScore({ name: settings.name, score, wave, at: scoreAt });
    }
    pushHud(true);
  }

  const probe = {
    getYaw: () => player.aim,
    getSpeed: () => Math.hypot(player.vx, player.vy),
    getX: () => player.x,
    getY: () => player.y,
    setKeys: (codes: string[]) => {
      inject = new Set(codes);
    },
    setSteer: (v: number) => {
      steerLock = v;
    },
    getShots: () => shots,
    getPhase: () => phase,
    getHp: () => player.hp,
  };

  function onKeyDown(e: KeyboardEvent) {
    if (isTyping(e)) return;
    if (e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
    keys.add(e.code);
    sfx.unlock();
    if (e.code === "Escape" || e.code === "KeyP") {
      if (phase === "play") pause();
      else if (phase === "pause") resume();
    } else if ((e.code === "Enter" || e.code === "Space") && phase === "menu") {
      start();
    }
  }
  function onKeyUp(e: KeyboardEvent) {
    keys.delete(e.code);
  }
  function setPointer(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
    pointer.type = e.pointerType;
  }
  function onPointerDown(e: PointerEvent) {
    if (phase !== "play") return;
    if (e.cancelable) e.preventDefault();
    if (e.pointerType !== "mouse") {
      if (pointerId !== null && e.pointerId !== pointerId) return;
      pointerId = e.pointerId;
      canvas.setPointerCapture?.(e.pointerId);
    }
    setPointer(e);
    pointerFresh = true;
    sfx.unlock();
  }
  function onPointerMove(e: PointerEvent) {
    if (e.pointerType === "touch" && e.pointerId !== pointerId) return;
    if (e.pointerType !== "mouse" && pointerId === null) return;
    setPointer(e);
    if (phase === "play") pointerFresh = true;
  }
  function onPointerUp(e: PointerEvent) {
    if (e.pointerType === "mouse") return;
    if (e.pointerId !== pointerId) return;
    pointerId = null;
    pointerFresh = false;
  }

  const ac = new AbortController();
  const opt = { signal: ac.signal };
  window.addEventListener("keydown", onKeyDown, opt);
  window.addEventListener("keyup", onKeyUp, opt);
  window.addEventListener("blur", () => keys.clear(), opt);
  document.addEventListener(
    "visibilitychange",
    () => {
      keys.clear();
      if (document.hidden && phase === "play") pause();
    },
    opt,
  );
  canvas.addEventListener("pointerdown", onPointerDown, { signal: ac.signal, passive: false });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault(), opt);
  window.addEventListener("pointermove", onPointerMove, opt);
  window.addEventListener("pointerup", onPointerUp, opt);
  window.addEventListener("pointercancel", onPointerUp, opt);
  const ro = new ResizeObserver(() => resize());
  ro.observe(canvas);
  resize();
  if (import.meta.env.DEV) window.__controlsTest = probe;
  pushHud(true);
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      ac.abort();
      ro.disconnect();
      cancelAnimationFrame(raf);
      if (window.__controlsTest === probe) delete window.__controlsTest;
    },
    start,
    pause,
    resume,
    toMenu,
    toggleMute,
    toggleShake,
    submitScore,
  };
}

function isTyping(e: Event) {
  const t = e.target;
  if (!(t instanceof HTMLElement)) return false;
  return t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable;
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      getX: () => number;
      getY: () => number;
      setKeys: (codes: string[]) => void;
      setSteer?: (v: number) => void;
      getShots?: () => number;
      getPhase?: () => string;
      getHp?: () => number;
    };
  }
}
