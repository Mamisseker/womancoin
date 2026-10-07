/**
 * Заводы: покупка, производство улучшений и накопительные баффы.
 *
 * Каждый завод — отдельный тип улучшения, поэтому стратегии отличаются:
 * кто-то собирает клик через монетный завод, кто-то разгоняет автоклик
 * через электростанцию. Завод покупается один раз, дальше работает сам:
 * раз в КД кладёт улучшение на склад, а игрок забирает его кнопкой.
 *
 * Собранное улучшение усиливает стат НАВСЕГДА — состояние баффов
 * хранится одним числом на стат, а не списком предметов: так их сразу
 * видно, легко ограничить и не нужно хранить инвентарь.
 *
 * Три источника бесконечного роста обязаны ограничиваться, иначе они
 * усилят самих себя до разрыва: машиностроительный сокращает КД, от
 * которого зависит, когда он же соберётся; химический повышает силу
 * собранных улучшений, включая свои; нанотехнологический поднимает
 * качество результата. Потолки лежат в CAP и применяются на
 * СБОРКЕ, а не на чтении — так предел виден уже в состоянии.
 */

import coinImg from '@/components/FactoryPage/factoryCoin.svg';
import experimentalImg from '@/components/FactoryPage/factoryExperimental.svg';
import chemImg from '@/components/FactoryPage/factoryChem.svg';
import crystalImg from '@/components/FactoryPage/factoryCrystal.svg';
import financeImg from '@/components/FactoryPage/factoryFinance.svg';
import machineImg from '@/components/FactoryPage/factoryMachine.svg';
import nanoImg from '@/components/FactoryPage/factoryNano.svg';
import powerImg from '@/components/FactoryPage/factoryPower.svg';
import robotImg from '@/components/FactoryPage/factoryRobot.svg';
import spaceImg from '@/components/FactoryPage/factorySpace.svg';

import { MICRO } from '@/lib/units.ts';

export type FactoryId =
  | 'coin'
  | 'power'
  | 'machine'
  | 'crystal'
  | 'chem'
  | 'robot'
  | 'finance'
  | 'nano'
  | 'space'
  | 'experimental';

export type EffectKind =
  | 'tap'
  | 'crit'
  | 'speed'
  | 'cooldown'
  | 'eff'
  | 'robot'
  | 'passive'
  | 'quality'
  | 'space'
  | 'experimental';

export interface FactoryDef {
  id: FactoryId;
  /** Название с эмодзи — так завод показывается игроку. */
  title: string;
  effect: EffectKind;
  /** Подпись эффекта под одним улучшением, как описал игрок. */
  effectText: string;
  image: string;
  /** Цена покупки уровня 1. Дальше умножается на 4 за уровень. */
  baseCost: number;
  /** Базовый КД производства улучшения, мс. */
  cycleMs: number;
}

export const FACTORIES: FactoryDef[] = [
  {
    id: 'coin',
    title: '🏭 Монетный',
    effect: 'tap',
    effectText: '+0.0001 к силе клика',
    image: coinImg,
    baseCost: 300,
    cycleMs: 30_000,
  },
  {
    id: 'power',
    title: '⚡ Электростанция',
    effect: 'speed',
    effectText: '+0.1% к скорости автокликера',
    image: powerImg,
    baseCost: 3_000,
    cycleMs: 45_000,
  },
  {
    id: 'machine',
    title: '⚙️ Машиностроительный',
    effect: 'cooldown',
    effectText: '−0.5 сек к КД заводов',
    image: machineImg,
    baseCost: 30_000,
    cycleMs: 60_000,
  },
  {
    id: 'crystal',
    title: '💎 Завод кристаллов',
    effect: 'crit',
    effectText: '+0.1% шанс получить ×2 за клик',
    image: crystalImg,
    baseCost: 300_000,
    cycleMs: 60_000,
  },
  {
    id: 'chem',
    title: '🧪 Химический',
    effect: 'eff',
    effectText: '+0.1% к эффективности всех улучшений',
    image: chemImg,
    baseCost: 3_000_000,
    cycleMs: 90_000,
  },
  {
    id: 'robot',
    title: '🤖 Робототехнический',
    effect: 'robot',
    effectText: '+1 дополнительный автоклик за цикл',
    image: robotImg,
    baseCost: 30_000_000,
    cycleMs: 90_000,
  },
  {
    id: 'finance',
    title: '🏦 Финансовый',
    effect: 'passive',
    effectText: '+0.1% к пассивному доходу',
    image: financeImg,
    baseCost: 300_000_000,
    cycleMs: 120_000,
  },
  {
    id: 'nano',
    title: '🔬 Нанотехнологический',
    effect: 'quality',
    effectText: 'повышает качество производимых улучшений',
    image: nanoImg,
    baseCost: 3_000_000_000,
    cycleMs: 120_000,
  },
  {
    id: 'space',
    title: '🚀 Аэрокосмический',
    effect: 'space',
    effectText: '×2 к кликам на 30 секунд',
    image: spaceImg,
    baseCost: 30_000_000_000,
    cycleMs: 180_000,
  },
  {
    id: 'experimental',
    title: '🏆 Экспериментальный',
    effect: 'experimental',
    effectText: 'редкие мощные улучшения ×5',
    image: experimentalImg,
    baseCost: 300_000_000_000,
    cycleMs: 240_000,
  },
];

export const getFactoryDef = (id: FactoryId): FactoryDef => {
  const def = FACTORIES.find((f) => f.id === id);
  if (!def) throw new Error(`Неизвестный завод: ${id}`);
  return def;
};

/** Сколько улучшений помещается на складе одного завода. */
export const MAX_STOCK = 5;

/** Базовая частота автокликера: один клик в секунду. */
export const BASE_AUTOCLICK_MS = 1000;
/** Множитель дохода за критический клик. */
export const CRIT_MULTIPLIER = 2;
/** Для сколько длится аэрокосмический буст, мс. */
export const SPACE_BUFF_MS = 30_000;
/** Доля сборов, которые экспериментальный завод превращает в редкие. */
export const RARE_CHANCE = 0.15;
/** Ценовой множитель за каждый следующий уровень завода. */
const LEVEL_COST_GROWTH = 4;
/** Каждый уровень ускоряет производство на 8%. */
const LEVEL_SPEEDUP = 0.92;
/** Сколько завод можно разогнать уровнем: до 30% от базового КД. */
const MIN_CYCLE_FACTOR = 0.3;

/** Величина одного улучшения до множителей, в бейсис-поинтах/миллисекундах. */
const EFFECT_AMOUNT: Record<EffectKind, number> = {
  tap: Math.round(0.0001 * MICRO), // 100 микро за тап
  crit: 10, // 0.1%
  speed: 10, // 0.1%
  cooldown: 500, // 0.5 сек
  eff: 10, // 0.1%
  robot: 1,
  passive: 10, // 0.1%
  quality: 1000, // +10%
  space: SPACE_BUFF_MS,
  experimental: 0,
};

/**
 * Потолки статов — они же ответ на «нужен предел».
 *
 * Каждая запись ограничивает направление, которое усиливает само себя:
 * cooldown упирается в КД, eff — в собранные улучшения, quality — в
 * производство. Без них три этих завода уходили бы в бесконечность.
 */
const CAP = {
  crit: 5_000, // 50% шанса крита
  speed: 90_000, // интервал автокликера не короче 100 мс (×10)
  cooldown: 60_000, // максимум −60 секунд к КД
  eff: 10_000, // эффективность улучшений ×2
  robot: 10, // до 11 автокликов за цикл
  passive: 10_000, // пассивный доход ×2
  quality: 20_000, // качество улучшений ×3
  space: 600_000, // буст не дольше 10 минут
} as const;

const clamp = (value: number, cap: number): number =>
  value < 0 ? 0 : value > cap ? cap : value;

/**
 * Накопленные баффы заводов.
 *
 * Состояние — одно число на стат: сколько процентов/микро уже собрано.
 * `lvl` — купленные заводы (0 = не куплен), `stock` и `readyAt` —
 * производство.
 */
export interface FactoryState {
  lvl: Record<string, number>;
  stock: Record<string, number>;
  readyAt: Record<string, number>;
  tapMicro: number;
  critBps: number;
  speedBps: number;
  cooldownMs: number;
  effBps: number;
  robot: number;
  passiveBps: number;
  qualityBps: number;
  spaceUntil: number;
}

export const createFactoryState = (): FactoryState => ({
  lvl: {},
  stock: {},
  readyAt: {},
  tapMicro: 0,
  critBps: 0,
  speedBps: 0,
  cooldownMs: 0,
  effBps: 0,
  robot: 0,
  passiveBps: 0,
  qualityBps: 0,
  spaceUntil: 0,
});

/** Что дают заводы остальному коду игры. */
export interface FactoryBonuses {
  /** Прибавка к силе клика, микро-единицы. */
  tapBonusMicro: number;
  /** Шанс критического клика, бейсис-поинты (10 000 = 100%). */
  critChanceBps: number;
  /** Интервал автокликера, мс. */
  autoclickIntervalMs: number;
  /** Сколько кликов делает автокликер за раз. */
  autoclickClicks: number;
  /** Множитель пассивного дохода. */
  passiveMult: number;
  /** Множитель дохода от аэрокосмического буста (1 или 2). */
  spaceMult: number;
  /** Сколько снято с КД заводов, мс. */
  cooldownMs: number;
  /** Сила собранных улучшений, ×1 — ×2. */
  effMult: number;
  /** Качество производимых улучшений, ×1 — ×3. */
  qualityMult: number;
}

export const computeFactoryBonuses = (
  state: FactoryState,
  now: number,
): FactoryBonuses => {
  const effMult = 1 + clamp(state.effBps, CAP.eff) / 10_000;
  const qualityMult = 1 + clamp(state.qualityBps, CAP.quality) / 10_000;
  const speedMult = 1 + clamp(state.speedBps, CAP.speed) / 10_000;
  const interval = Math.max(100, Math.round(BASE_AUTOCLICK_MS / speedMult));

  return {
    tapBonusMicro: state.tapMicro,
    critChanceBps: clamp(state.critBps, CAP.crit),
    autoclickIntervalMs: interval,
    autoclickClicks: 1 + clamp(state.robot, CAP.robot),
    passiveMult: 1 + clamp(state.passiveBps, CAP.passive) / 10_000,
    spaceMult: now < state.spaceUntil ? 2 : 1,
    cooldownMs: clamp(state.cooldownMs, CAP.cooldown),
    effMult,
    qualityMult,
  };
};

/** Цена перехода на следующий уровень завода. */
export const getFactoryCost = (def: FactoryDef, level: number): number =>
  Math.round(def.baseCost * Math.pow(LEVEL_COST_GROWTH, level));

/**
 * КД производства улучшения с учётом уровня и машиностроительного.
 *
 * Сокращение КД упирается в потолок относительно БАЗОВОГО КД, иначе
 * ускорение от собранных улучшений ушло бы в минус и цикл обрушился бы.
 */
export const getFactoryCycleMs = (def: FactoryDef, level: number, cooldownMs: number): number =>
  Math.max(
    Math.round(def.cycleMs * MIN_CYCLE_FACTOR),
    Math.round(def.cycleMs * Math.pow(LEVEL_SPEEDUP, Math.max(0, level - 1))) -
      cooldownMs,
  );

/** Стадии производства одной карточки. */
export interface FactoryProgress {
  level: number;
  owned: boolean;
  cost: number;
  cycleMs: number;
  /** Сколько улучшений ждёт на складе. */
  stock: number;
  /** Сколько осталось ждать, 0 если уже готово. */
  waitMs: number;
  ready: boolean;
  /** Склад забран — производство стоит до сбора. */
  full: boolean;
}

export const getFactoryProgress = (
  state: FactoryState,
  def: FactoryDef,
  now: number,
): FactoryProgress => {
  const level = state.lvl[def.id] ?? 0;
  const owned = level > 0;
  const stock = state.stock[def.id] ?? 0;
  const cycleMs = owned ? getFactoryCycleMs(def, level, state.cooldownMs) : def.cycleMs;
  const readyAt = state.readyAt[def.id] ?? 0;
  const full = stock >= MAX_STOCK;
  const waitMs = !owned || full ? 0 : Math.max(0, readyAt - now);

  return {
    level,
    owned,
    cost: getFactoryCost(def, level),
    cycleMs,
    stock,
    waitMs,
    ready: owned && !full && waitMs === 0,
    full,
  };
};

/**
 * Догоняет производство: считает всё, что созрело, пока игрок не смотрел.
 *
 * В отдельной функции, а не в тике, чтобы одинаково работать на загрузке
 * после закрытия приложения и при обычном тике в открытом.
 */
export const advanceProduction = (
  state: FactoryState,
  now: number,
): FactoryState => {
  const next: FactoryState = { ...state, stock: { ...state.stock }, readyAt: { ...state.readyAt } };

  for (const def of FACTORIES) {
    const level = next.lvl[def.id] ?? 0;
    if (level <= 0) continue;

    const cycleMs = getFactoryCycleMs(def, level, next.cooldownMs);
    let stock = next.stock[def.id] ?? 0;
    let readyAt = next.readyAt[def.id] ?? now;
    if (readyAt === 0) readyAt = now + cycleMs;

    // Склад забран — производство встаёт до момента сбора.
    if (stock >= MAX_STOCK) {
      next.readyAt[def.id] = readyAt < now ? now : readyAt;
      continue;
    }

    while (stock < MAX_STOCK && now >= readyAt) {
      stock += 1;
      readyAt += cycleMs;
    }

    next.stock[def.id] = stock;
    next.readyAt[def.id] = readyAt;
  }

  return next;
};

/**
 * Применяет собранное улучшение к стату.
 *
 * Множители качества и эффективности считаются ЗДЕСЬ, а не при чтении
 * стата: если считать их на чтении, каждая вставка химического
 * задним числом переписала бы всю историю и собранные улучшения
 * растили бы сами себя в цикле.
 */
const applyEffect = (
  state: FactoryState,
  kind: EffectKind,
  amount: number,
  effMult: number,
  qualityMult: number,
  now: number,
  rare: boolean,
): void => {
  // Редкое улучшение экспериментального завода: ×5 к силе.
  const boost = effMult * qualityMult * (rare ? 5 : 1);
  const scaled = Math.max(1, Math.round(amount * boost));

  switch (kind) {
    case 'tap':
      state.tapMicro += scaled;
      break;
    case 'crit':
      state.critBps = clamp(state.critBps + scaled, CAP.crit);
      break;
    case 'speed':
      state.speedBps = clamp(state.speedBps + scaled, CAP.speed);
      break;
    case 'cooldown':
      state.cooldownMs = clamp(state.cooldownMs + scaled, CAP.cooldown);
      break;
    case 'eff':
      state.effBps = clamp(state.effBps + scaled, CAP.eff);
      break;
    case 'robot':
      state.robot = clamp(state.robot + scaled, CAP.robot);
      break;
    case 'passive':
      state.passiveBps = clamp(state.passiveBps + scaled, CAP.passive);
      break;
    case 'quality':
      state.qualityBps = clamp(state.qualityBps + scaled, CAP.quality);
      break;
    case 'space': {
      const duration = clamp(scaled, CAP.space);
      state.spaceUntil = Math.max(state.spaceUntil, now) + duration;
      break;
    }
    case 'experimental':
      break;
  }
};

/** Откуда Экспериментальный завод тянет случайный редкий эффект. */
const EXPERIMENTAL_POOL: EffectKind[] = ['tap', 'crit', 'speed', 'passive'];

export interface CollectResult {
  state: FactoryState;
  /** Сколько улучшений забрали. */
  count: number;
  /** Попался ли редкий (×5) эффект. */
  rare: boolean;
  /** Что именно упало — для сообщения игроку. */
  kind: EffectKind;
}

/**
 * Собирает всё, что накопилось на складе завода, и применяет баффы.
 *
 * `random` подаётся снаружи, чтобы редкость проверялась тестом, а не
 * «иногда проходит».
 */
export const collectImprovements = (
  state: FactoryState,
  id: FactoryId,
  now: number,
  random: () => number = Math.random,
): CollectResult => {
  const def = getFactoryDef(id);
  const count = state.stock[id] ?? 0;
  const bonuses = computeFactoryBonuses(state, now);

  const next: FactoryState = {
    ...state,
    stock: { ...state.stock },
    readyAt: { ...state.readyAt },
  };

  if (count <= 0 || (next.lvl[id] ?? 0) <= 0) {
    return { state: next, count: 0, rare: false, kind: def.effect };
  }

  const rare = def.effect === 'experimental' || random() < RARE_CHANCE;
  let kind = def.effect;

  // Экспериментальный завод отдаёт редкий эффект из случайной группы.
  if (def.effect === 'experimental') {
    kind = EXPERIMENTAL_POOL[Math.floor(random() * EXPERIMENTAL_POOL.length)];
  }

  for (let i = 0; i < count; i += 1) {
    applyEffect(
      next,
      kind,
      EFFECT_AMOUNT[kind],
      bonuses.effMult,
      bonuses.qualityMult,
      now,
      rare,
    );
  }

  next.stock[id] = 0;
  // После сбора отсчёт идёт заново: иначе накопленное в прошлом время
  // мгновенно даст ещё одно улучшение.
  next.readyAt[id] = now;

  return { state: next, count, rare, kind };
};

/** Сколько стоит следующий уровень (или покупка на уровне 0). */
export const buyFactory = (state: FactoryState, id: FactoryId, now: number): FactoryState => {
  const def = getFactoryDef(id);
  const level = state.lvl[id] ?? 0;
  const next: FactoryState = {
    ...state,
    lvl: { ...state.lvl },
    stock: { ...state.stock },
    readyAt: { ...state.readyAt },
  };
  next.lvl[id] = level + 1;
  if (level === 0) {
    next.stock[id] = 0;
    // Первый цикл считаем по НОВОМУ уровню: на повышенном он короче.
    next.readyAt[id] = now + getFactoryCycleMs(def, next.lvl[id], next.cooldownMs);
  }
  return advanceProduction(next, now);
};

/** Что рисовать на карточке рядом со статусом. */
export const describeEffect = (def: FactoryDef): string => def.effectText;

/**
 * Бросок крита по целым бейсис-поинтам.
 *
 * Сравниваем два целых, а не `Math.random() < 0.005`: округление вниз
 * превращало бы 0.5% в шанс, который никогда не срабатывает.
 */
export const rollCrit = (chanceBps: number, roll: number): boolean =>
  chanceBps > 0 && roll < chanceBps;

export const RARE_EFFECT_LABELS: Record<EffectKind, string> = {
  tap: 'сила клика',
  crit: 'шанс крита',
  speed: 'скорость автокликера',
  cooldown: 'КД заводов',
  eff: 'эффективность улучшений',
  robot: 'автоклики',
  passive: 'пассивный доход',
  quality: 'качество улучшений',
  space: '×2 к кликам',
  experimental: 'редкое улучшение',
};