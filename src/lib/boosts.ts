/**
 * Определения бустов и чистая логика фаз.
 *
 * Вынесено отдельно от компонента, чтобы хуки не тянули в себя
 * презентационную обвязку (framer-motion и разметку) — им нужны
 * только определения, константы и функции расчёта фаз.
 *
 * Фазы задаются ДВУМЯ метками времени, а не одной:
 *   работа   now < workUntil
 *   откат    workUntil <= now < readyAt
 *   готов    now >= readyAt
 * Одной меткой обойтись нельзя: если хранить только конец отката,
 * буст сразу после нажатия выглядит как работающий на всю длину
 * отката, а отдельной фазы отката не существует вовсе.
 */

export type BoostId = 'turboTap' | 'regen' | 'jackpot';

export interface BoostDef {
  id: BoostId;
  icon: string;
  title: string;
  /** Что делает буст — короткое описание под кнопкой. */
  detail: string;
  /** Сколько буст работает, мс. */
  workMs: number;
  /** Сколько идёт откат до возможности включить снова, мс. */
  cooldownMs: number;
}

export interface BoostState {
  /** Unix-время окончания работы (мс), 0 — если буст никогда не жался. */
  workUntil: number;
  /** Unix-время окончания отката, после которого буст снова готов (мс). */
  readyAt: number;
}

export const BOOSTS: BoostDef[] = [
  {
    id: 'turboTap',
    icon: '👆',
    title: 'Турбо-тап',
    detail: '×5 к тапу',
    workMs: 30_000,
    cooldownMs: 120_000,
  },
  {
    id: 'regen',
    icon: '⚡',
    title: 'Бодрость',
    detail: '×10 энергии',
    workMs: 45_000,
    cooldownMs: 180_000,
  },
  {
    id: 'jackpot',
    icon: '🎁',
    title: 'Бонус',
    detail: '+0.0005',
    workMs: 1,
    cooldownMs: 240_000,
  },
];

/** Множитель монет за тап во время «Турбо-тапа». */
export const TURBO_TAP_MULTIPLIER = 5;
/** Множитель скорости регена энергии во время «Бодрости». */
export const REGEN_MULTIPLIER = 10;
/** Мгновенная выплата «Бонуса» в микро-единицах. */
export const JACKPOT_MICRO = 500;

export type BoostPhase = 'ready' | 'work' | 'cooldown';

/** Текущая фаза буста. */
export const getBoostPhase = (state: BoostState, now: number): BoostPhase => {
  if (state.readyAt === 0 || now >= state.readyAt) return 'ready';
  if (now < state.workUntil) return 'work';
  return 'cooldown';
};

/** Осталось миллисекунд до конца текущей фазы; 0, если фазы нет. */
export const getPhaseLeft = (state: BoostState, now: number): number => {
  const phase = getBoostPhase(state, now);
  if (phase === 'ready') return 0;
  return phase === 'work' ? state.workUntil - now : state.readyAt - now;
};

/** Форматирование оставшегося времени: «59с», «2м 05с». */
export const formatRemaining = (ms: number): string => {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `${sec}с`;
  return `${min}м ${String(sec).padStart(2, '0')}с`;
};