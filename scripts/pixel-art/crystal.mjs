/**
 * Генератор пиксель-арт ассета «кристалл» (интерактивный tap-объект).
 *
 * Принципы:
 *  - ОДИН символ = ОДИН пиксель (палитра строго односимвольная, иначе
 *    склейка строк ломает карту пикселей).
 *  - Все строки гарантированно одинаковой ширины.
 *  - Никаких сглаживаний: только дискретные цвета и жёсткие квадраты.
 *
 * Свет: тёплый, сверху-слева. Тени: глубокие сине-фиолетовые (не чёрные).
 *
 * Запуск:  node scripts/pixel-art/crystal.mjs
 * Вывод:   public/assets/crystal/*.png  +  src/assets/crystal.json
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');

const W = 28;
const H = 36;

/**
 * Односимвольная палитра (пост-Retro / GBA).
 * ' ' — прозрачный пиксель.
 */
const PALETTE = {
  ' ': null, // прозрачный
  // --- контуры и глубина ---
  K: '#0a0e1c', // контур (почти чёрный, сине-фиолетовый)
  B: '#1b2140', // тень
  D: '#2c3358', // полутень
  // --- камень ---
  s: '#39405f', // камень в тени
  S: '#4d5578', // камень
  t: '#6b7495', // камень свет
  u: '#8b93b3', // камень верхняя грань
  // --- мох / трава ---
  g: '#0d2211', // трава тень
  G: '#1d5426', // трава
  h: '#2f7a38', // трава свет
  H: '#46994a', // трава блик
  k: '#63b95e', // трава верхний блик
  // --- кристалл (от тёмного к светлому) ---
  1: '#0c2b2a',
  2: '#134539',
  3: '#1c6152',
  4: '#2a8a6a',
  5: '#3fb589',
  6: '#62d6a4',
  7: '#95f0c6',
  // --- свет и акценты ---
  L: '#f7e3ae', // тёплый свет
  W: '#fff6d8', // тёплый яркий
  A: '#ffd166', // акцент-искра
};

/** Затемнение для pressed-состояния (объект «вжался» вниз). */
const DIM = { 7: '6', 6: '5', 5: '4', 4: '3', 3: '2', 2: '1', L: '6', W: '6' };

class Canvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.px = Array.from({ length: h }, () => new Array(w).fill(' '));
  }

  set(x, y, ch) {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (!Number.isFinite(xi) || !Number.isFinite(yi)) return;
    if (xi < 0 || yi < 0 || xi >= this.w || yi >= this.h) return;
    this.px[yi][xi] = ch;
  }

  /** Обводит контуром все непрозрачные пиксели. */
  outline(ch) {
    const src = this.px.map((r) => r.slice());
    for (let y = 0; y < this.h; y += 1) {
      for (let x = 0; x < this.w; x += 1) {
        if (src[y][x] !== ' ') continue;
        const near =
          (x > 0 && src[y][x - 1] !== ' ') ||
          (x < this.w - 1 && src[y][x + 1] !== ' ') ||
          (y > 0 && src[y - 1][x] !== ' ') ||
          (y < this.h - 1 && src[y + 1][x] !== ' ');
        if (near) this.px[y][x] = ch;
      }
    }
  }

  /** Жёстко гарантирует одинаковую ширину всех строк. */
  toRows() {
    return this.px.map((r) => r.join('').slice(0, this.w).padEnd(this.w, ' '));
  }
}

const CX = 14;

/**
 * ЕДИНЫЙ силуэт ассета: полуширина каждой строки от верхушки к низу.
 *
 * Ключевое правило: |hw[i+1] - hw[i]| <= 1. При резких перепадах ширины
 * outline() вынужден заливать боковые разрывы, и контур превращается в
 * толстые полосы. Плавный профиль даёт ровно 1 px контура везде.
 */
// Кристалл (16) сужается, камень (4) продолжает, земля (7) снова
// расширяется и заканчивается ПЛОСКОЙ широкой полосой.
const SILHOUETTE = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 13, 13, 13,
  12, 11, 10, 9,
  10, 11, 12, 13, 13, 13, 13,
];

/** Индексы строк силуэта: где кристалл, где камень, где земля. */
const GEM_ROWS = 16; // строки 0..15 — кристалл
const ROCK_ROWS = 4; // строки 16..19 — камень постамента
// строки 20.. — земля/мох
const SIL_TOP = 4;

/** Гранёный кристалл. */
function drawGem(c, { dy = 0, dim = false } = {}) {
  const put = (x, y, ch) => c.set(x, y, dim ? (DIM[ch] ?? ch) : ch);

  for (let i = 0; i < GEM_ROWS; i += 1) {
    const hw = SILHOUETTE[i];
    const y = SIL_TOP + dy + i;
    const x0 = CX - hw;
    const x1 = CX + hw - 1;
    const depth = i / (GEM_ROWS - 1);

    for (let x = x0; x <= x1; x += 1) {
      // -1 = левая грань (свет сверху-слева), +1 = правая (тень)
      const t = hw <= 1 ? 0 : ((x - x0) / (x1 - x0)) * 2 - 1;
      let ch;
      if (t < -0.74) ch = '7';
      else if (t < -0.3) ch = '6';
      else if (t < 0.1) ch = '5';
      else if (t < 0.46) ch = '3';
      else if (t < 0.78) ch = '2';
      else ch = '1';
      // Низ уходит в тень
      if (depth > 0.7) {
        if (ch === '7') ch = '6';
        else if (ch === '6') ch = '5';
      }
      put(x, y, ch);
    }

    // Диагональная линия огранки
    put(Math.round(CX - hw * 0.1), y, i < 3 ? '7' : '3');
  }

  // Тёплый блик сверху-слева
  put(CX - 5, SIL_TOP + dy + 3, 'W');
  put(CX - 4, SIL_TOP + dy + 4, 'W');
  put(CX - 5, SIL_TOP + dy + 4, 'L');
  put(CX - 4, SIL_TOP + dy + 5, 'L');
  put(CX - 6, SIL_TOP + dy + 6, '6');
  // Искра-акцент на правой грани
  put(CX + 6, SIL_TOP + dy + 7, 'A');
}

/** Каменный постамент — продолжает силуэт без разрывов. */
function drawPedestal(c, { dy = 0, shrink = 0, dim = false } = {}) {
  for (let i = 0; i < ROCK_ROWS; i += 1) {
    const hw = Math.max(2, SILHOUETTE[GEM_ROWS + i] - shrink);
    const y = SIL_TOP + dy + GEM_ROWS + i;
    for (let x = CX - hw; x <= CX + hw - 1; x += 1) {
      const t = (x - (CX - hw)) / (hw * 2 - 1);
      let ch;
      if (i === 0) ch = t < 0.42 ? 'u' : t < 0.74 ? 't' : 'S';
      else if (i === ROCK_ROWS - 1) ch = t < 0.3 ? 'S' : 's';
      else if (t < 0.24) ch = 't';
      else if (t > 0.76) ch = 's';
      else ch = 'S';
      c.set(x, y, dim && (ch === 'u' || ch === 't') ? 't' : ch);
    }
  }
  return SIL_TOP + dy + GEM_ROWS + ROCK_ROWS;
}

/** Земляной бугор с мхом — нижняя часть силуэта. */
function drawBase(c, { topY, dim = false } = {}) {
  for (let i = GEM_ROWS + ROCK_ROWS; i < SILHOUETTE.length; i += 1) {
    const hw = SILHOUETTE[i];
    const y = topY + (i - GEM_ROWS - ROCK_ROWS);
    for (let x = CX - hw; x <= CX + hw - 1; x += 1) {
      const t = (x - (CX - hw)) / (hw * 2 - 1);
      let ch;
      if (i === GEM_ROWS + ROCK_ROWS) ch = t < 0.32 ? 'k' : t < 0.6 ? 'h' : 'G';
      else if (i >= SILHOUETTE.length - 3) ch = t < 0.32 ? 'G' : 'g';
      else ch = t < 0.24 ? 'h' : t > 0.78 ? 'g' : 'G';
      c.set(x, y, dim ? (ch === 'k' ? 'h' : ch === 'h' ? 'G' : ch) : ch);
    }
  }

  // Камешки и тёплая искра — внутри массива, контур не рвётся.
  c.set(11, topY + 1, dim ? 's' : 'S');
  c.set(12, topY + 1, dim ? 's' : 't');
  c.set(17, topY + 2, dim ? 's' : 'S');
  c.set(14, topY + 1, dim ? '6' : 'A');
}

function build({ pressed }) {
  const c = new Canvas(W, H);
  const dy = pressed ? 2 : 0;
  drawGem(c, { dy, dim: pressed });
  const topY = drawPedestal(c, { dy, shrink: pressed ? 1 : 0, dim: pressed });
  drawBase(c, { topY, dim: pressed });
  c.outline(pressed ? 'B' : 'K');
  return c;
}

// ---------- PNG encoder (RGBA8, zero filter, zlib) ----------

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i += 1) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(rows, scale = 1) {
  const h = rows.length;
  const w = rows[0].length;
  const raw = Buffer.alloc(h * scale * (w * scale * 4 + 1));
  let o = 0;
  for (let y = 0; y < h; y += 1) {
    for (let sy = 0; sy < scale; sy += 1) {
      raw[o] = 0; // filter: none
      o += 1;
      for (let x = 0; x < w; x += 1) {
        const hex = PALETTE[rows[y][x]];
        for (let sx = 0; sx < scale; sx += 1) {
          if (hex) {
            raw[o] = parseInt(hex.slice(1, 3), 16);
            raw[o + 1] = parseInt(hex.slice(3, 5), 16);
            raw[o + 2] = parseInt(hex.slice(5, 7), 16);
            raw[o + 3] = 255;
          } else {
            raw[o] = 0; raw[o + 1] = 0; raw[o + 2] = 0; raw[o + 3] = 0;
          }
          o += 4;
        }
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w * scale, 0);
  ihdr.writeUInt32BE(h * scale, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const MARKS = {
  K: '#', B: '%', D: '&',
  s: 's', S: 'S', t: 't', u: 'u',
  g: '.', G: ',', h: 'c', H: 'C', k: 'K',
  1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
  L: 'L', W: 'W', A: '*',
};

function preview(rows) {
  return rows.map((r) => [...r].map((ch) => MARKS[ch] ?? ' ').join('')).join('\n');
}

// ---------- Генерация и валидация ----------

const idle = build({ pressed: false }).toRows();
const pressed = build({ pressed: true }).toRows();

let failed = false;
for (const [name, rows] of [['idle', idle], ['pressed', pressed]]) {
  rows.forEach((row, i) => {
    if (row.length !== W) {
      console.error(`✗ ${name}: строка ${i} — ширина ${row.length}, ожидалось ${W}`);
      failed = true;
    }
  });
}

const used = new Set([...idle.join(''), ...pressed.join('')].filter((c) => c !== ' '));
for (const ch of used) {
  if (!(ch in PALETTE)) {
    console.error(`✗ символ "${ch}" отсутствует в палитре`);
    failed = true;
  }
}
if (failed) process.exit(1);

const outDir = resolve(ROOT, 'public', 'assets', 'crystal');
mkdirSync(outDir, { recursive: true });

writeFileSync(resolve(outDir, 'crystal-idle.png'), encodePng(idle, 1));
writeFileSync(resolve(outDir, 'crystal-idle@8x.png'), encodePng(idle, 8));
writeFileSync(resolve(outDir, 'crystal-pressed.png'), encodePng(pressed, 1));
writeFileSync(resolve(outDir, 'crystal-pressed@8x.png'), encodePng(pressed, 8));

writeFileSync(
  resolve(ROOT, 'src', 'assets', 'crystal.json'),
  `${JSON.stringify(
    {
      meta: {
        name: 'crystal-tap',
        width: W,
        height: H,
        states: ['idle', 'pressed'],
        paletteSize: Object.keys(PALETTE).length,
        engine: '16-bit',
        encoding: 'char-per-pixel',
        transparentChar: ' ',
      },
      palette: PALETTE,
      idle,
      pressed,
    },
    null,
    2,
  )}\n`,
);

console.log(`✓ валидация пройдена: ${W}x${H}, ${Object.keys(PALETTE).length} цветов, 2 состояния`);
console.log('✓ PNG: public/assets/crystal/ (1:1 + @8x превью)');
console.log('✓ JSON: src/assets/crystal.json');
console.log('\n--- IDLE ---\n' + preview(idle));