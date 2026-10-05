/**
 * Определения бустов и чистая логика состояния.
 *
 * Вынесено отдельно от компонента, чтобы хуки не тянули в себя
 * презентационную обвязку (framer-motion и разметку) — им нужны
 * только определения, константы и функции расчёта.
 *
 * У буста стак из MAX_CHARGES применений: каждое нажатие тратит один
 * заряд и даёт отдельный отрезок работы (workMs). Когда заряды кончились,
 * запускается откат — по refillMs возвращается ровно один заряд, потом
 * ещё один, потом третий. Средний темп набора зарядов совпадает с прежним
 * кулдауном, но запас можно размазать: не тратить все три сразу или
 * копить их до удобного момента.
 *
 * Отсчёт привязан к абсолютному времени, поэтому закрытое приложение
 * не «замораживает» ни работу, ни дозарядку — при возврате заряды
 * набегают за всё прошедшее время.
 */

/** Сколько применений можно сохранить в одном бусте. */
export const MAX_CHARGES = 3;

export type BoostId = 'turboTap' | 'regen' | 'jackpot';

export interface BoostDef {
  id: BoostId;
  icon: string;
  title: string;
  /** Что делает буст — короткое описание под кнопкой. */
  detail: string;
  /** Сколько длится работа одного применения, мс. */
  workMs: number;
  /** Через сколько возвращается один заряд, мс. */
  refillMs: number;
}

export interface BoostState {
  /** Сколько применений осталось, 0..MAX_CHARGES. */
  charges: number;
  /** Unix-время окончания текущей работы (мс), 0 — если буст не работает. */
  workUntil: number;
  /** Unix-время прихода следующего заряда (мс), 0 — если дозарядка не идёт. */
  refillAt: number;
}

export const BOOSTS: BoostDef[] = [
  {
    id: 'turboTap',
    icon: '👆',
    title: 'Турбо-тап',
    detail: '×5 к тапу',
    workMs: 30_000,
    refillMs: 120_000,
  },
  {
    id: 'regen',
    icon: '⚡',
    title: 'Бодрость',
    detail: '×10 энергии',
    workMs: 45_000,
    refillMs: 180_000,
  },
  {
    id: 'jackpot',
    icon: '🎁',
    title: 'Бонус',
    detail: '+0,0005',
    workMs: 1,
    refillMs: 240_000,
  },
];

/** Множитель монет за тап во время «Турбо-тапа». */
export const TURBO_TAP_MULTIPLIER = 5;
/** Множитель скорости регена энергии во время «Бодрости». */
export const REGEN_MULTIPLIER = 10;
/** Мгновенная выплата «Бонуса» в микро-единицах. */
export const JACKPOT_MICRO = 500;

const clamp = (n: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, n));

/**
 * Начальное состояние: полный стак.
 *
 * Именно полный, а не пустой: буст с нулём зарядов и не запущенной
 * дозарядкой нельзя было бы применить никогда, поэтому стартовать
 * с пустого стака — значит заблокировать кнопку навсегда.
 */
export const readyBoostState = (): BoostState => ({
  charges: MAX_CHARGES,
  workUntil: 0,
  refillAt: 0,
});

export interface BoostView {
  /** Идёт ли работа прямо сейчас. */
  working: boolean;
  /** Осталось работы, мс (0, если не работает). */
  workLeft: number;
  /** Сколько зарядов доступно сейчас с учётом дозарядки. */
  charges: number;
  /** Через сколько придёт следующий заряд, мс (0, если заряды полные или идёт работа). */
  refillLeft: number;
}

/**
 * Аккуратно продвигает состояние до момента now.
 *
 * Одна и та же функция работает и на тике, и при загрузке сохранения:
 * если игрок закрыл приложение на середине отката, заряды успеют
 * набежать за всё прошедшее время, а не продолжат копиться с нуля.
 */
export const advanceBoost = (
  state: BoostState,
  def: BoostDef,
  now: number,
): BoostState => {
  let charges = clamp(state.charges, 0, MAX_CHARGES);
  let refillAt = state.refillAt;
  let workUntil = state.workUntil;

  // Просроченную работу сбрасываем, чтобы она не висела мусором в хранилище.
  if (workUntil !== 0 && workUntil <= now) workUntil = 0;

  // Набежавшие заряды. Цикл короткий: заряд всего MAX_CHARGES.
  while (charges < MAX_CHARGES && refillAt !== 0 && now >= refillAt) {
    charges += 1;
    refillAt = charges >= MAX_CHARGES ? 0 : refillAt + def.refillMs;
  }

  // Страховка от «мёртвого» буста: зарядов нет и дозарядка не идёт —
  // запускаем её. Без этого кнопка блокировалась бы навсегда, и
  // потерянное состояние (например, запись старой схемы) обнуляло бы
  // буст без возможности восстановиться.
  if (charges === 0 && refillAt === 0) refillAt = now + def.refillMs;

  return { charges, workUntil, refillAt };
};

/** Взгляд на буст для отрисовки и проверок. */
export const getBoostView = (state: BoostState, now: number): BoostView => {
  const working = state.workUntil > now;
  const charges = clamp(state.charges, 0, MAX_CHARGES);

  return {
    working,
    workLeft: working ? state.workUntil - now : 0,
    charges,
    refillLeft:
      charges >= MAX_CHARGES || state.refillAt === 0
        ? 0
        : Math.max(0, state.refillAt - now),
  };
};

/**
 * Доля заполнения кольца: работа считается от полного кольца вниз,
 * дозарядка — от нуля вверх до следующего заряда.
 */
export const getRingProgress = (view: BoostView, def: BoostDef): number => {
  if (view.working) {
    return Math.min(1, Math.max(0, view.workLeft / def.workMs));
  }
  if (view.charges >= MAX_CHARGES) return 1;
  if (view.refillLeft <= 0) return 0;
  return Math.min(1, Math.max(0, 1 - view.refillLeft / def.refillMs));
};

/** Форматирование оставшегося времени: «59с», «2м 05с». */
export const formatRemaining = (ms: number): string => {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `${sec}с`;
  return `${min}м ${String(sec).padStart(2, '0')}с`;
};