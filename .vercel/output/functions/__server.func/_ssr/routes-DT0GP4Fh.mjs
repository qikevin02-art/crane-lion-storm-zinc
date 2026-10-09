import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as Play, d as Crosshair, i as Trophy, l as Pause, n as VolumeX, o as Shield, r as Volume2, s as RotateCcw, t as Zap, u as Heart } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DT0GP4Fh.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var dart_default = "/assets/dart-Bja1WMLU.png";
var cruiser_default = "/assets/cruiser-CI83k-CI.png";
var player_default = "/assets/player-DK0SdHOF.png";
var weaver_default = "/assets/weaver-o6N705fX.png";
var Sfx = class {
	ctx = null;
	master = null;
	noise = null;
	muted = false;
	unlock() {
		const AC = window.AudioContext;
		if (!AC) return;
		if (!this.ctx) {
			this.ctx = new AC();
			this.master = this.ctx.createGain();
			this.master.gain.value = .2;
			this.master.connect(this.ctx.destination);
			const len = Math.floor(this.ctx.sampleRate * .35);
			const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
			const data = buf.getChannelData(0);
			for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
			this.noise = buf;
		}
		if (this.ctx.state === "suspended") this.ctx.resume();
	}
	shoot() {
		this.tone(720 + Math.random() * 90, .045, "square", .045, 240);
	}
	hit() {
		this.tone(180, .06, "triangle", .05, 90);
	}
	explode() {
		this.burst(.22, .16, 420);
		this.tone(140, .18, "sawtooth", .05, 50);
	}
	hurt() {
		this.burst(.16, .12, 240);
		this.tone(90, .2, "square", .06, 40);
	}
	pickup() {
		this.tone(520, .07, "square", .05);
		this.tone(780, .09, "square", .04);
	}
	shield() {
		this.tone(880, .08, "sine", .05, 1320);
	}
	wave() {
		this.tone(440, .1, "triangle", .05);
		this.tone(660, .14, "triangle", .045);
	}
	tone(freq, dur, type, gain, toFreq) {
		if (!this.ctx || !this.master || this.muted) return;
		const t = this.ctx.currentTime;
		const osc = this.ctx.createOscillator();
		const amp = this.ctx.createGain();
		osc.type = type;
		osc.frequency.setValueAtTime(freq, t);
		if (toFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(40, toFreq), t + dur);
		amp.gain.setValueAtTime(gain, t);
		amp.gain.exponentialRampToValueAtTime(1e-4, t + dur);
		osc.connect(amp);
		amp.connect(this.master);
		osc.start(t);
		osc.stop(t + dur + .02);
	}
	burst(dur, gain, freq) {
		if (!this.ctx || !this.master || !this.noise || this.muted) return;
		const t = this.ctx.currentTime;
		const src = this.ctx.createBufferSource();
		src.buffer = this.noise;
		const filter = this.ctx.createBiquadFilter();
		filter.type = "lowpass";
		filter.frequency.setValueAtTime(freq, t);
		const amp = this.ctx.createGain();
		amp.gain.setValueAtTime(gain, t);
		amp.gain.exponentialRampToValueAtTime(1e-4, t + dur);
		src.connect(filter);
		filter.connect(amp);
		amp.connect(this.master);
		src.start(t);
		src.stop(t + dur);
	}
};
var shared = null;
function getSfx() {
	if (!shared) shared = new Sfx();
	return shared;
}
/** Screen-space move for an overhead camera. +x is right, +y is down.
*  A / ArrowLeft decreases x (ship slides left on screen).
*  D / ArrowRight increases x. W / ArrowUp decreases y. S increases y.
*  This is translation, not chase-cam yaw.
*/
function moveVector(held) {
	let x = 0;
	let y = 0;
	if (held.has("KeyA") || held.has("ArrowLeft")) x -= 1;
	if (held.has("KeyD") || held.has("ArrowRight")) x += 1;
	if (held.has("KeyW") || held.has("ArrowUp")) y -= 1;
	if (held.has("KeyS") || held.has("ArrowDown")) y += 1;
	const m = Math.hypot(x, y);
	if (m > 1) {
		x /= m;
		y /= m;
	}
	return {
		x,
		y
	};
}
/** Radial stick deadzone with edge remapped to full magnitude. */
function radialDeadzone(x, y, dz = .18) {
	const m = Math.hypot(x, y);
	if (m < dz || m === 0) return {
		x: 0,
		y: 0
	};
	const scale = (m - dz) / ((1 - dz) * m);
	return {
		x: x * scale,
		y: y * scale
	};
}
var SCORE_KEY = "yajing-dawang-scores-v1";
var SET_KEY = "yajing-dawang-settings-v1";
var MAX_BOARD = 8;
var DEFAULT_SETTINGS = {
	muted: false,
	shake: null,
	name: "雅静"
};
function sanitizeName(raw) {
	return raw.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 8) || "雅静";
}
function loadScores() {
	try {
		const raw = localStorage.getItem(SCORE_KEY);
		if (!raw) return [];
		const data = JSON.parse(raw);
		if (!data || !Array.isArray(data.list)) return [];
		return data.list.filter((row) => row && typeof row.name === "string" && typeof row.score === "number" && typeof row.wave === "number" && typeof row.at === "number").slice(0, MAX_BOARD);
	} catch {
		return [];
	}
}
function upsertScore(entry) {
	const list = loadScores().filter((row) => row.at !== entry.at);
	list.push({
		...entry,
		name: sanitizeName(entry.name)
	});
	list.sort((a, b) => b.score - a.score || a.at - b.at);
	const top = list.slice(0, MAX_BOARD);
	try {
		localStorage.setItem(SCORE_KEY, JSON.stringify({
			version: 1,
			list: top
		}));
	} catch {}
	return top;
}
function loadSettings() {
	try {
		const raw = localStorage.getItem(SET_KEY);
		if (!raw) return { ...DEFAULT_SETTINGS };
		const data = JSON.parse(raw);
		return {
			muted: Boolean(data.muted),
			shake: typeof data.shake === "boolean" ? data.shake : null,
			name: sanitizeName(typeof data.name === "string" ? data.name : "雅静")
		};
	} catch {
		return { ...DEFAULT_SETTINGS };
	}
}
function saveSettings(next) {
	try {
		localStorage.setItem(SET_KEY, JSON.stringify({
			...next,
			name: sanitizeName(next.name),
			version: 1
		}));
	} catch {}
}
var MAX_HP = 5;
var BASE_SPEED = 340;
var STEP = 1 / 60;
var MULTI_TIME = 14;
var SHIELD_TIME = 10;
var BOOST_TIME = 9;
var INITIAL_HUD = {
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
	finalWave: 1
};
var SCORE = {
	dart: 100,
	weaver: 160,
	cruiser: 700
};
function clamp(v, a, b) {
	return Math.max(a, Math.min(b, v));
}
function angDiff(from, to) {
	let d = to - from;
	while (d > Math.PI) d -= Math.PI * 2;
	while (d < -Math.PI) d += Math.PI * 2;
	return d;
}
function makePool(n, create) {
	return Array.from({ length: n }, create);
}
function take(pool) {
	for (const item of pool) if (!item.alive) return item;
	return null;
}
function loadSprite(url) {
	const img = new Image();
	img.decoding = "async";
	img.src = url;
	return img;
}
function createGame(canvas, onHud) {
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("无法创建画布");
	const sfx = getSfx();
	const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	let settings = loadSettings();
	let scores = loadScores();
	let shakeOn = settings.shake === null ? !reduce : settings.shake;
	let muted = settings.muted;
	sfx.muted = muted;
	const sprites = {
		player: loadSprite(player_default),
		dart: loadSprite(dart_default),
		weaver: loadSprite(weaver_default),
		cruiser: loadSprite(cruiser_default)
	};
	const keys = /* @__PURE__ */ new Set();
	let inject = null;
	let steerLock = null;
	let pointerFresh = false;
	let pointerId = null;
	const pointer = {
		x: 0,
		y: 0,
		type: "mouse"
	};
	let w = 1;
	let h = 1;
	let dpr = 1;
	let phase = "menu";
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
		r: 16
	};
	const bullets = makePool(180, () => ({
		alive: false,
		x: 0,
		y: 0,
		vx: 0,
		vy: 0,
		friendly: true,
		r: 4,
		life: 0
	}));
	const enemies = makePool(28, () => ({
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
		origin: 0
	}));
	const pickups = makePool(12, () => ({
		alive: false,
		kind: "multi",
		x: 0,
		y: 0,
		life: 12,
		r: 16
	}));
	const particles = makePool(240, () => ({
		alive: false,
		x: 0,
		y: 0,
		vx: 0,
		vy: 0,
		life: 0,
		max: 1,
		radius: 2,
		color: "#2ad4ff"
	}));
	const flashes = makePool(16, () => ({
		alive: false,
		x: 0,
		y: 0,
		aim: 0,
		life: 0,
		max: .07
	}));
	const rings = makePool(16, () => ({
		alive: false,
		x: 0,
		y: 0,
		life: 0,
		max: .4
	}));
	const popups = makePool(24, () => ({
		alive: false,
		x: 0,
		y: 0,
		life: 0,
		text: "",
		color: "#ffb020"
	}));
	let stars = [];
	const planet = {
		x: .78,
		y: -.1,
		r: 86
	};
	function bestScore() {
		return scores[0]?.score ?? 0;
	}
	function snapshot() {
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
			finalWave: wave
		};
	}
	function pushHud(force = false) {
		const now = performance.now();
		if (!force && now - lastHud < 100) return;
		lastHud = now;
		onHud(snapshot());
	}
	function persistSettings() {
		settings = {
			...settings,
			muted,
			shake: shakeOn
		};
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
		const count = w * h < 302400 ? 70 : 120;
		if (stars.length !== count) stars = Array.from({ length: count }, () => ({
			x: Math.random(),
			y: Math.random(),
			z: Math.random() < .55 ? 0 : Math.random() < .7 ? 1 : 2,
			s: Math.random(),
			tw: Math.random() * Math.PI * 2
		}));
	}
	function popup(x, y, text, color) {
		const p = take(popups);
		if (!p) return;
		p.alive = true;
		p.x = x;
		p.y = y;
		p.text = text;
		p.color = color;
		p.life = .7;
	}
	function burst(x, y, n, color) {
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
			p.life = .35 + Math.random() * .35;
			p.max = p.life;
			p.radius = 1.5 + Math.random() * 2.4;
			p.color = color;
		}
		const ring = take(rings);
		if (ring) {
			ring.alive = true;
			ring.x = x;
			ring.y = y;
			ring.life = .38;
			ring.max = .38;
		}
	}
	function spawnBullet(x, y, vx, vy, friendly) {
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
	function muzzle(x, y, aim) {
		const f = take(flashes);
		if (!f) return;
		f.alive = true;
		f.x = x;
		f.y = y;
		f.aim = aim;
		f.life = .07;
		f.max = .07;
	}
	function spawnPickup(x, y, kind) {
		const p = take(pickups);
		if (!p) return;
		p.alive = true;
		p.kind = kind;
		p.x = x;
		p.y = y;
		p.life = 12;
		p.r = 16;
	}
	function rollEnemy(current) {
		const r = Math.random();
		if (current >= 4 && r < Math.min(.22, .08 + current * .012)) return "cruiser";
		if (current >= 2 && r < .5) return "weaver";
		return "dart";
	}
	function spawnEnemy(type) {
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
		e.fireCd = .8 + Math.random() * .8;
		const bonus = Math.floor((wave - 1) / 4);
		e.maxHp = type === "cruiser" ? 8 + wave : type === "weaver" ? 2 + bonus : 1 + Math.floor(bonus / 2);
		e.hp = e.maxHp;
		e.vx = 0;
		e.vy = 0;
		return true;
	}
	function beginWave(n) {
		wave = n;
		toSpawn = 6 + n * 2;
		spawnCd = 1.05;
		waveBreak = 0;
		banner = `第 ${n} 波`;
		bannerT = 1.7;
		const kinds = [
			"multi",
			"shield",
			"boost"
		];
		const lane = .22 + (n - 1) % 3 * .28;
		spawnPickup(w * lane, -24, kinds[(n - 1) % 3]);
		if (n > 1) sfx.wave();
		pushHud(true);
	}
	function applyPickup(kind) {
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
	function killEnemy(e) {
		e.alive = false;
		if (comboT > 0) combo = Math.min(8, combo + 1);
		else combo = 1;
		comboT = 1.55;
		const mult = Math.min(4, combo);
		const gain = SCORE[e.type] * mult;
		score += gain;
		popup(e.x, e.y, combo > 1 ? `+${gain} x${mult}` : `+${gain}`, "#ffb020");
		burst(e.x, e.y, e.type === "cruiser" ? 26 : 12, e.type === "dart" ? "#ffb020" : "#ffd27a");
		trauma = Math.min(1, trauma + (e.type === "cruiser" ? .55 : .3));
		hitstop = e.type === "cruiser" ? .055 : .03;
		sfx.explode();
		if (Math.random() < (e.type === "cruiser" ? 1 : .2)) spawnPickup(e.x, e.y, [
			"multi",
			"shield",
			"boost"
		][Math.floor(Math.random() * 3)]);
		pushHud(true);
	}
	function hurtPlayer() {
		if (dead || player.iframes > 0) return;
		if (player.shieldT > 0) {
			player.shieldT = Math.max(0, player.shieldT - 2.6);
			player.iframes = .22;
			trauma = Math.min(1, trauma + .22);
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
		player.flash = .12;
		trauma = Math.min(1, trauma + .5);
		hitstop = .05;
		sfx.hurt();
		burst(player.x, player.y, 10, "#e7f4ff");
		if (player.hp <= 0) {
			dead = true;
			deadT = .9;
			player.hp = 0;
			burst(player.x, player.y, 36, "#ffb020");
			trauma = 1;
			hitstop = .08;
			sfx.explode();
		}
		pushHud(true);
	}
	function activeHeld() {
		return inject ?? keys;
	}
	function readMove() {
		const key = moveVector(activeHeld());
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
		return {
			x,
			y,
			mag: Math.min(1, m)
		};
	}
	function nearestEnemy() {
		let best = null;
		let bestD = 547600;
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
	function step(dt) {
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
			if (Math.hypot(dx, dy) > .8) {
				const k = 1 - Math.exp(-14 * dt);
				let mx = dx * k;
				let my = dy * k;
				const stepLen = Math.hypot(mx, my);
				const cap = speed * dt;
				if (stepLen > cap) {
					mx = mx / stepLen * cap;
					my = my / stepLen * cap;
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
		const interval = player.multi >= 3 ? .11 : player.multi === 2 ? .135 : .16;
		if (player.fireCd <= 0) {
			player.fireCd = interval;
			const spreads = player.multi >= 3 ? [
				-.22,
				0,
				.22
			] : player.multi === 2 ? [-.12, .12] : [0];
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
			engineCd = .03;
			const p = take(particles);
			if (p) {
				const a = player.aim + Math.PI;
				p.alive = true;
				p.x = player.x + Math.cos(a) * 24;
				p.y = player.y + Math.sin(a) * 24;
				p.vx = Math.cos(a) * 80 + (Math.random() - .5) * 30;
				p.vy = Math.sin(a) * 80 + (Math.random() - .5) * 30;
				p.life = .22;
				p.max = .22;
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
					spawnCd = Math.max(.28, .84 - wave * .045);
				} else spawnCd = .2;
			}
			const alive = enemies.some((e) => e.alive);
			if (toSpawn === 0 && !alive) {
				const bonus = 150 * wave;
				score += bonus;
				banner = `第 ${wave} 波肃清  +${bonus}`;
				bannerT = 1.6;
				waveBreak = 2;
				popup(w / 2, h * .33, `+${bonus}`, "#ffb020");
				sfx.wave();
				pushHud(true);
			}
		}
		for (const e of enemies) {
			if (!e.alive) continue;
			e.t += dt;
			e.flash = Math.max(0, e.flash - dt);
			const spd = (e.type === "cruiser" ? 52 : e.type === "weaver" ? 108 : 168) + Math.min(90, wave * 6);
			if (e.type === "weaver") {
				const amp = Math.min(120, w * .2);
				e.vx = Math.cos(e.t * 2.15 + e.phase) * amp * 2.15;
				e.vy = spd;
				e.x = e.origin + Math.sin(e.t * 2.15 + e.phase) * amp;
				e.y += e.vy * dt;
			} else if (e.type === "dart") {
				const home = wave >= 3 ? 70 : 0;
				e.vx = clamp(player.x - e.x, -home, home);
				e.vy = spd;
				e.x += e.vx * dt;
				e.y += e.vy * dt;
			} else {
				e.vx = Math.sin(e.t * .7 + e.phase) * 36;
				e.vy = spd;
				e.x += e.vx * dt;
				e.y += e.vy * dt;
			}
			if (e.type !== "dart" && e.y > 10 && e.y < h * .92) {
				e.fireCd -= dt;
				if (e.fireCd <= 0) {
					e.fireCd = e.type === "cruiser" ? Math.max(.72, 1.55 - wave * .04) : Math.max(1, 2.2 - wave * .06);
					const base = Math.atan2(player.y - e.y, player.x - e.x);
					const spreads = e.type === "cruiser" ? [
						-.3,
						0,
						.3
					] : [0];
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
			const a = enemies[i];
			if (!a.alive) continue;
			for (let j = i + 1; j < enemies.length; j++) {
				const b = enemies[j];
				if (!b.alive) continue;
				const dx = b.x - a.x;
				const dy = b.y - a.y;
				const min = a.r + b.r + 6;
				const d = Math.hypot(dx, dy) || .001;
				if (d < min) {
					const overlap = (min - d) * .5;
					const px = dx / d * overlap;
					const py = dy / d * overlap;
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
				if (Math.hypot(b.x - e.x, b.y - e.y) < b.r + e.r) {
					b.alive = false;
					e.hp -= 1;
					e.flash = .08;
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
			if (Math.hypot(e.x - player.x, e.y - player.y) < e.r * .72 + player.r) {
				hurtPlayer();
				if (e.type !== "cruiser") {
					e.hp -= 2;
					e.flash = .1;
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
			if (dist < 130 && dist > .1) {
				p.x += dx / dist * 240 * dt;
				p.y += dy / dist * 240 * dt;
			} else p.y += 42 * dt;
			if (dist < p.r + player.r + 6) {
				p.alive = false;
				applyPickup(p.kind);
			} else if (p.life <= 0 || p.y > h + 40) p.alive = false;
		}
		updateFx(dt);
	}
	function updateFx(dt) {
		for (const p of particles) {
			if (!p.alive) continue;
			p.life -= dt;
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.vx *= .98;
			p.vy *= .98;
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
		if (score > 0) scores = upsertScore({
			name: settings.name,
			score,
			wave,
			at: scoreAt
		});
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
		player.fireCd = .15;
		player.multi = 1;
		player.multiT = 0;
		player.shieldT = 0;
		player.boostT = 0;
		player.flash = 0;
		player.aim = -Math.PI / 2;
		player.vx = 0;
		player.vy = 0;
		player.x = w * .5;
		player.y = h * .72;
		shots = 0;
		hitstop = 0;
		beginWave(1);
	}
	function drawSprite(img, x, y, height, rotation, flash) {
		if (!img.complete || img.naturalWidth === 0) return false;
		const dw = height * (img.width / img.height);
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(rotation);
		if (flash > 0) ctx.filter = "brightness(2.6) saturate(0.2)";
		ctx.drawImage(img, -dw / 2, -height / 2, dw, height);
		ctx.filter = "none";
		ctx.restore();
		return true;
	}
	function drawFallbackShip(x, y, rot, scale, hostile) {
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
		const ox = shake ? (Math.sin(clock * 47) * .5 + Math.sin(clock * 23)) * 10 * shake : 0;
		const oy = shake ? (Math.cos(clock * 41) * .5 + Math.sin(clock * 19)) * 10 * shake : 0;
		ctx.clearRect(0, 0, w, h);
		ctx.fillStyle = "#061018";
		ctx.fillRect(0, 0, w, h);
		ctx.save();
		ctx.translate(ox, oy);
		const neb = ctx.createRadialGradient(w * .2, h * .2, 10, w * .25, h * .3, w * .55);
		neb.addColorStop(0, "rgba(42,212,255,0.08)");
		neb.addColorStop(1, "rgba(42,212,255,0)");
		ctx.fillStyle = neb;
		ctx.fillRect(0, 0, w, h);
		const neb2 = ctx.createRadialGradient(w * .85, h * .7, 10, w * .8, h * .75, w * .4);
		neb2.addColorStop(0, "rgba(255,176,32,0.06)");
		neb2.addColorStop(1, "rgba(255,176,32,0)");
		ctx.fillStyle = neb2;
		ctx.fillRect(0, 0, w, h);
		const parallax = (player.x - w / 2) / Math.max(1, w);
		const speeds = [
			16,
			48,
			120
		];
		const py = clock * speeds[0] % (h + 200) - 40;
		ctx.beginPath();
		ctx.fillStyle = "rgba(36,78,120,0.55)";
		ctx.arc(planet.x * w - parallax * 18, (planet.y * h + py) % (h + 220) - 80, planet.r, 0, Math.PI * 2);
		ctx.fill();
		ctx.beginPath();
		ctx.strokeStyle = "rgba(42,212,255,0.35)";
		ctx.lineWidth = 3;
		ctx.ellipse(planet.x * w - parallax * 18, (planet.y * h + py) % (h + 220) - 80, planet.r + 18, planet.r * .28, -.4, 0, Math.PI * 2);
		ctx.stroke();
		for (const s of stars) {
			const layer = s.z;
			const spd = speeds[layer] ?? 30;
			const y = (s.y * h + clock * spd) % h;
			const x = s.x * w - parallax * (10 + layer * 22);
			const alpha = .35 + s.s * .65;
			ctx.globalAlpha = .35 + .4 * (.5 + .5 * Math.sin(clock * 2 + s.tw));
			ctx.fillStyle = layer === 2 ? "#e7f4ff" : layer === 1 ? "#8aa4c4" : "#23415f";
			if (layer === 2) {
				ctx.globalAlpha = alpha;
				ctx.fillRect(x, y, 1.6, 8 + s.s * 10);
			} else {
				ctx.globalAlpha = alpha * (layer === 0 ? .7 : 1);
				ctx.beginPath();
				ctx.arc(x, y, layer === 0 ? .8 : 1.3, 0, Math.PI * 2);
				ctx.fill();
			}
		}
		ctx.globalAlpha = 1;
		for (const p of pickups) {
			if (!p.alive) continue;
			const bob = Math.sin(clock * 4 + p.x) * 3;
			drawPickup(p.x, p.y + bob, p.kind, p.life < 2 ? .45 + .55 * Math.sin(clock * 12) : 1);
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
			if (!drawSprite(img, e.x, e.y, height, rot, e.flash)) drawFallbackShip(e.x, e.y, rot, e.type === "cruiser" ? 2 : 1.1, true);
			if (e.maxHp > 1 && e.hp < e.maxHp) {
				const bw = e.r * 1.6;
				ctx.fillStyle = "#102033";
				ctx.fillRect(e.x - bw / 2, e.y - height * .55, bw, 4);
				ctx.fillStyle = "#ffb020";
				ctx.fillRect(e.x - bw / 2, e.y - height * .55, bw * (e.hp / e.maxHp), 4);
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
			const px = phase === "menu" ? w * .5 : player.x;
			const pyShip = (phase === "menu" ? h * .8 : player.y) + bob;
			const rot = (phase === "menu" ? -Math.PI / 2 : player.aim) + Math.PI / 2;
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
				ctx.strokeStyle = `rgba(42,212,255,${.45 + .35 * Math.sin(clock * 6)})`;
				ctx.lineWidth = 2;
				ctx.arc(px, pyShip, 32 + Math.sin(clock * 5) * 1.5, 0, Math.PI * 2);
				ctx.stroke();
			}
			if (!(player.iframes > 0 && Math.sin(clock * 28) > 0) || phase !== "play") {
				if (!drawSprite(sprites.player, px, pyShip, 78, rot, player.flash)) drawFallbackShip(px, pyShip, rot, 1.4, false);
			}
		}
		for (const f of flashes) {
			if (!f.alive) continue;
			const k = f.life / f.max;
			ctx.save();
			ctx.translate(f.x, f.y);
			ctx.rotate(f.aim);
			ctx.globalAlpha = Math.min(1, k + .25);
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
		ctx.font = "600 15px Orbitron, \"Noto Sans SC\", sans-serif";
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
			ctx.font = "700 28px Orbitron, \"Noto Sans SC\", sans-serif";
			ctx.fillText(banner, w / 2, h * .28);
			ctx.globalAlpha = 1;
		}
		ctx.restore();
		const vig = ctx.createRadialGradient(w / 2, h / 2, h * .3, w / 2, h / 2, h * .75);
		vig.addColorStop(0, "rgba(0,0,0,0)");
		vig.addColorStop(1, "rgba(0,0,0,0.45)");
		ctx.fillStyle = vig;
		ctx.fillRect(0, 0, w, h);
		if (phase === "play" && player.hp === 1 && !dead) {
			ctx.fillStyle = `rgba(255,176,32,${.08 + .06 * Math.sin(clock * 6)})`;
			ctx.fillRect(0, 0, w, h);
		}
	}
	function drawLock(e) {
		const s = e.r + 10;
		ctx.strokeStyle = "rgba(42,212,255,0.85)";
		ctx.lineWidth = 1.5;
		for (const [sx, sy] of [
			[
				-1,
				-1,
				1,
				0
			],
			[
				1,
				-1,
				-1,
				0
			],
			[
				-1,
				1,
				1,
				0
			],
			[
				1,
				1,
				-1,
				0
			]
		]) {
			const x = e.x + sx * s;
			const y = e.y + sy * s;
			ctx.beginPath();
			ctx.moveTo(x, y + sy * -8);
			ctx.lineTo(x, y);
			ctx.lineTo(x + sx * -10, y);
			ctx.stroke();
		}
	}
	function drawFriendlyBolt(b) {
		ctx.save();
		ctx.translate(b.x, b.y);
		ctx.rotate(Math.atan2(b.vy, b.vx));
		ctx.fillStyle = "#e7f4ff";
		ctx.fillRect(-10, -1.6, 16, 3.2);
		ctx.fillStyle = "#2ad4ff";
		ctx.fillRect(-6, -2.4, 10, 4.8);
		ctx.restore();
	}
	function drawHostileBolt(b) {
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
	function drawPickup(x, y, kind, alpha) {
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
		if (kind === "multi") for (const ox of [
			-6,
			0,
			6
		]) {
			ctx.beginPath();
			ctx.moveTo(ox, -7);
			ctx.lineTo(ox + 3.2, 0);
			ctx.lineTo(ox, 7);
			ctx.lineTo(ox - 3.2, 0);
			ctx.closePath();
			ctx.fill();
		}
		else if (kind === "shield") {
			ctx.beginPath();
			for (let i = 0; i < 6; i++) {
				const a = -Math.PI / 2 + i * Math.PI / 3;
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
	function frame(now) {
		const dt = Math.min(.05, (now - last) / 1e3);
		last = now;
		clock += dt;
		trauma = Math.max(0, trauma - dt * 1.7);
		if (phase === "play" && hitstop > 0) hitstop -= dt;
		else if (phase === "play") {
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
	function submitScore(name) {
		settings = {
			...settings,
			name: sanitizeName(name)
		};
		saveSettings(settings);
		if (score > 0) {
			if (!scoreAt) scoreAt = Date.now();
			scores = upsertScore({
				name: settings.name,
				score,
				wave,
				at: scoreAt
			});
		}
		pushHud(true);
	}
	const probe = {
		getYaw: () => player.aim,
		getSpeed: () => Math.hypot(player.vx, player.vy),
		getX: () => player.x,
		getY: () => player.y,
		setKeys: (codes) => {
			inject = new Set(codes);
		},
		setSteer: (v) => {
			steerLock = v;
		},
		getShots: () => shots,
		getPhase: () => phase,
		getHp: () => player.hp
	};
	function onKeyDown(e) {
		if (isTyping(e)) return;
		if (e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
		keys.add(e.code);
		sfx.unlock();
		if (e.code === "Escape" || e.code === "KeyP") {
			if (phase === "play") pause();
			else if (phase === "pause") resume();
		} else if ((e.code === "Enter" || e.code === "Space") && phase === "menu") start();
	}
	function onKeyUp(e) {
		keys.delete(e.code);
	}
	function setPointer(e) {
		const rect = canvas.getBoundingClientRect();
		pointer.x = e.clientX - rect.left;
		pointer.y = e.clientY - rect.top;
		pointer.type = e.pointerType;
	}
	function onPointerDown(e) {
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
	function onPointerMove(e) {
		if (e.pointerType === "touch" && e.pointerId !== pointerId) return;
		if (e.pointerType !== "mouse" && pointerId === null) return;
		setPointer(e);
		if (phase === "play") pointerFresh = true;
	}
	function onPointerUp(e) {
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
	document.addEventListener("visibilitychange", () => {
		keys.clear();
		if (document.hidden && phase === "play") pause();
	}, opt);
	canvas.addEventListener("pointerdown", onPointerDown, {
		signal: ac.signal,
		passive: false
	});
	canvas.addEventListener("contextmenu", (e) => e.preventDefault(), opt);
	window.addEventListener("pointermove", onPointerMove, opt);
	window.addEventListener("pointerup", onPointerUp, opt);
	window.addEventListener("pointercancel", onPointerUp, opt);
	const ro = new ResizeObserver(() => resize());
	ro.observe(canvas);
	resize();
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
		submitScore
	};
}
function isTyping(e) {
	const t = e.target;
	if (!(t instanceof HTMLElement)) return false;
	return t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable;
}
function formatScore(n) {
	return n.toLocaleString("zh-CN");
}
function StarGame() {
	const canvasRef = (0, import_react.useRef)(null);
	const apiRef = (0, import_react.useRef)(null);
	const [hud, setHud] = (0, import_react.useState)(INITIAL_HUD);
	const [name, setName] = (0, import_react.useState)("雅静");
	const seeded = (0, import_react.useRef)(false);
	(0, import_react.useLayoutEffect)(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const api = createGame(canvas, setHud);
		apiRef.current = api;
		return () => {
			api.destroy();
			apiRef.current = null;
		};
	}, []);
	(0, import_react.useEffect)(() => {
		if (!seeded.current && hud.pilot) {
			setName(hud.pilot);
			seeded.current = true;
		}
	}, [hud.pilot]);
	const playing = hud.phase === "play";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "game-shell fixed inset-0 overflow-hidden bg-void text-ink",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
				ref: canvasRef,
				className: playing ? "absolute inset-0 block h-full w-full touch-none cursor-none" : "absolute inset-0 block h-full w-full touch-none"
			}),
			playing && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: "safe-top pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-mist",
							children: "机体 · 雅静大王"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-2xl font-bold tabular-nums text-amber",
							children: formatScore(hud.score)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-mist",
							children: [
								"第 ",
								hud.wave,
								" 波 · 剩余 ",
								hud.left,
								hud.combo > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-amber",
									children: [" · 连击 x", Math.min(4, hud.combo)]
								}) : null,
								hud.record ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-cyan",
									children: " · 新纪录"
								}) : null
							]
						})
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mr-14 text-right",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-mist",
								children: "最高"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-bold tabular-nums",
								children: formatScore(hud.best)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-2 flex justify-end gap-1",
								"aria-label": `生命 ${hud.hp}`,
								children: Array.from({ length: hud.maxHp }, (_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: i < hud.hp ? hud.hp === 1 ? "h-2 w-5 rounded-full bg-amber" : "h-2 w-5 rounded-full bg-cyan" : "h-2 w-5 rounded-full bg-line" }, i))
							})
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "safe-top pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-end",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "pointer-events-auto m-3 inline-flex size-11 items-center justify-center rounded-full border border-line bg-panel text-ink",
						"aria-label": "暂停",
						onClick: () => apiRef.current?.pause(),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, { className: "size-5" })
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
					className: "safe-bottom pointer-events-none absolute inset-x-0 bottom-0 z-10 flex gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Meter, {
							icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Crosshair, { className: "size-4" }),
							label: hud.multi > 1 ? `火力 ${hud.multi}` : "火力 1",
							active: hud.multi > 1,
							ratio: hud.multi > 1 ? hud.multiT / 14 : 0
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Meter, {
							icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "size-4" }),
							label: "护盾",
							active: hud.shieldT > 0,
							ratio: hud.shieldT / 10
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Meter, {
							icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, { className: "size-4" }),
							label: "加速",
							active: hud.boostT > 0,
							ratio: hud.boostT / 9
						})
					]
				})
			] }),
			hud.phase === "menu" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-0 z-20 flex items-center justify-center overflow-y-auto px-4 py-8 pb-20",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "w-full max-w-md rounded-card border border-line bg-panel p-5 shadow-2xl",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-medium tracking-widest text-cyan",
							children: "YJ-01"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "mt-1 text-4xl font-bold",
							children: "雅静大王"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-mist",
							children: "俯视突击 · 波次清场"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
							className: "mt-4 space-y-1.5 text-sm text-mist",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "WASD 或方向键移动，指针拖动同样跟手" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "自动开火，锁定最近的敌人" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "拾取多重射击、护盾与加速" })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 flex gap-3 text-xs text-mist",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "inline-flex items-center gap-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Heart, { className: "size-3.5 text-cyan" }), " 五格生命"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "inline-flex items-center gap-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trophy, { className: "size-3.5 text-amber" }), " 本地最高分"]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScoreList, {
							scores: hud.scores,
							mark: 0
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-card bg-cyan px-4 font-bold text-void",
							onClick: () => apiRef.current?.start(),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-5" }), "出击"]
						})
					]
				})
			}),
			hud.phase === "pause" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-0 z-20 flex items-center justify-center bg-void/70 px-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "w-full max-w-sm rounded-card border border-line bg-panel p-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-2xl font-bold",
							children: "已暂停"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-sm text-mist",
							children: [
								"第 ",
								hud.wave,
								" 波 · ",
								formatScore(hud.score),
								" 分"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-sm text-mist",
							children: "Esc 或 P 继续。移动不影响瞄准，火力会自己找目标。"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 flex gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-card border border-line px-3 text-sm",
								onClick: () => apiRef.current?.toggleMute(),
								children: [hud.muted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumeX, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { className: "size-4" }), hud.muted ? "音效关" : "音效开"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "inline-flex min-h-11 flex-1 items-center justify-center rounded-card border border-line px-3 text-sm",
								onClick: () => apiRef.current?.toggleShake(),
								children: ["震屏", hud.shakeOn ? "开" : "关"]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-card bg-cyan font-bold text-void",
							onClick: () => apiRef.current?.resume(),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-5" }), "继续"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-card border border-line text-sm",
							onClick: () => apiRef.current?.start(),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "size-4" }), "重新开始"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "mt-2 inline-flex min-h-11 w-full items-center justify-center text-sm text-mist",
							onClick: () => apiRef.current?.toMenu(),
							children: "返回标题"
						})
					]
				})
			}),
			hud.phase === "over" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-0 z-20 flex items-center justify-center overflow-y-auto px-4 py-8 pb-20",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "w-full max-w-md rounded-card border border-line bg-panel p-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-cyan",
							children: "机体损毁"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "mt-1 text-3xl font-bold",
							children: "雅静大王"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-2 text-sm text-mist",
							children: [
								"第 ",
								hud.finalWave,
								" 波 ·",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-bold text-amber tabular-nums",
									children: formatScore(hud.score)
								}),
								" 分",
								hud.record ? " · 新纪录" : ""
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "mt-4 block text-xs text-mist",
							htmlFor: "pilot-name",
							children: "呼号"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "pilot-name",
							value: name,
							maxLength: 8,
							autoComplete: "off",
							onChange: (e) => setName(e.target.value),
							onKeyDown: (e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									apiRef.current?.submitScore(name);
								}
							},
							className: "mt-1 w-full rounded-card border border-line bg-void px-3 py-3 text-ink"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-card border border-line text-sm",
							onClick: () => apiRef.current?.submitScore(name),
							children: "记入最高分榜"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScoreList, {
							scores: hud.scores,
							mark: hud.scoreAt
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-card bg-cyan font-bold text-void",
							onClick: () => {
								apiRef.current?.submitScore(name);
								apiRef.current?.start();
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "size-5" }), "再来一局"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "mt-2 inline-flex min-h-11 w-full items-center justify-center text-sm text-mist",
							onClick: () => apiRef.current?.toMenu(),
							children: "返回标题"
						})
					]
				})
			})
		]
	});
}
function Meter({ icon, label, active, ratio }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: active ? "min-w-24 rounded-card border border-line bg-panel/90 px-2 py-1.5 text-ink" : "min-w-24 rounded-card border border-line bg-panel/70 px-2 py-1.5 text-mist",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-1 text-xs",
			children: [icon, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-1 h-1 overflow-hidden rounded-full bg-line",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "h-full bg-cyan",
				style: { width: `${Math.max(0, Math.min(1, ratio)) * 100}%` }
			})
		})]
	});
}
function ScoreList({ scores, mark }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
			className: "flex items-center gap-1 text-sm font-bold",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trophy, { className: "size-4 text-amber" }), "最高分榜"]
		}), scores.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-sm text-mist",
			children: "还没有战绩，出击成为第一。"
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
			className: "mt-2 space-y-1",
			children: scores.map((row, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: row.at === mark ? "flex items-center justify-between rounded-md bg-void px-2 py-1 text-sm text-cyan" : "flex items-center justify-between px-2 py-1 text-sm",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-mist",
						children: i + 1
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "flex-1 truncate px-2",
						children: row.name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-mist",
						children: [
							"第",
							row.wave,
							"波"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "w-20 text-right font-bold tabular-nums text-amber",
						children: formatScore(row.score)
					})
				]
			}, row.at))
		})]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StarGame, {});
}
//#endregion
export { Home as component };
