/**
 * Хранение прогресса игрока.
 *
 * Ключевая идея: всё состояние лежит ОДНИМ ключом в CloudStorage.
 *
 * Раньше монеты, энергия, отметка времени и четыре уровня прокачки
 * писались отдельными вызовами setItem — 5-6 мостовых запросов на каждое
 * сохранение. При закрытии или сворачивании WebView Telegram обрывает
 * неотправленные запросы, поэтому часть ключей доезжала, а часть нет.
 * На следующем запуске прогресс читался «наполовину» — визуально прокачка
 * откатывалась (например, уровень клика есть, а монеты за него списаны нет).
 *
 * Один атомарный setItem решает это: состояние либо записалось целиком,
 * либо не записалось вовсе. Плюс один запрос вместо шести — шанс успеть
 * до выгрузки страницы кратно выше.
 *
 * Для надёжности поверх CloudStorage используется outbox в localStorage:
 * он синхронный и не обрывается при закрытии, поэтому несохранённое
 * состояние переживает сессию и досылается при следующем запуске.
 */

import { cloudStorage } from '@tma.js/sdk-react';

import { decrypt, encrypt } from '@/lib/storageCodec.ts';

export type UpgradeId = 'damage' | 'energy' | 'regen' | 'passive';

export interface ProgressState {
  /** Монеты. */
  c: number;
  /** Текущая энергия. */
  e: number;
  /** Уровни прокачек. */
  l: Record<UpgradeId, number>;
  /** Unix-время последнего применения оффлайн-начислений (мс). */
  u: number;
  /** Версия формата. */
  v: 2;
}

/** Единый ключ хранения всего состояния. */
const STATE_KEY = 'wc_state_v2';
/** Outbox: состояние, записанное в localStorage, но ещё не подтверждённое CloudStorage. */
const OUTBOX_KEY = 'wc_outbox_v2';

/** Ключи старого формата — только для миграции прогресса существующих игроков. */
const LEGACY_KEYS = {
  coins: 'wc_coins',
  energy: 'wc_energy',
  updated: 'wc_updated',
  reset: 'wc_reset_v2',
  levels: {
    damage: 'wc_up_damage',
    energy: 'wc_up_energy',
    regen: 'wc_up_regen',
    passive: 'wc_up_passive',
  },
} as const;

const LEGACY_KEY_LIST: string[] = [
  LEGACY_KEYS.coins,
  LEGACY_KEYS.energy,
  LEGACY_KEYS.updated,
  LEGACY_KEYS.reset,
  ...Object.values(LEGACY_KEYS.levels),
];

const emptyLevels = (): Record<UpgradeId, number> => ({
  damage: 0,
  energy: 0,
  regen: 0,
  passive: 0,
});

/**
 * Приводит распознанный набор значений к валидному состоянию.
 * Любой невалидный/взломанный элемент заменяется безопасным значением,
 * но остальные поля состояния при этом НЕ теряются.
 */
export const sanitizeState = (raw: unknown): ProgressState | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;

  const num = (value: unknown): number | null => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.floor(n) : null;
  };

  const c = num(obj.c);
  const e = num(obj.e);
  const u = num(obj.u);
  if (c === null || e === null || u === null) return null;

  const srcLevels =
    typeof obj.l === 'object' && obj.l !== null ? (obj.l as Record<string, unknown>) : {};
  const lvl = (id: UpgradeId): number => Math.max(0, num(srcLevels[id]) ?? 0);

  return {
    c: Math.max(0, c),
    e: Math.max(0, e),
    l: {
      damage: lvl('damage'),
      energy: lvl('energy'),
      regen: lvl('regen'),
      passive: lvl('passive'),
    },
    u,
    v: 2,
  };
};

/** Разбор строки, сохранённой в нашем зашифрованном формате. */
const parseRaw = (raw: string | undefined): unknown => {
  if (!raw) return null;
  const decoded = raw.startsWith('v1:') ? decrypt(raw) : raw;
  if (decoded === null) return null;
  try {
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

const parseOutbox = (raw: string | null): ProgressState | null => {
  if (!raw) return null;
  try {
    return sanitizeState(JSON.parse(raw));
  } catch {
    return null;
  }
};

/**
 * Читает состояние из старого формата (раздельные ключи).
 * Используется только для миграции: ни одно новое сохранение
 * больше не пишет эти ключи по отдельности.
 */
const readLegacyState = async (): Promise<ProgressState | null> => {
  const items = await cloudStorage.getItems(LEGACY_KEY_LIST);

  // Старые значения бывают как зашифрованными, так и plaintext-числами.
  const readNumber = (key: string): number | null => {
    const raw = items[key];
    if (!raw) return null;
    const decoded = raw.startsWith('v1:') ? decrypt(raw) : raw;
    if (decoded === null || !Number.isFinite(Number(decoded))) return null;
    return Number(decoded);
  };

  const levels = emptyLevels();
  for (const id of Object.keys(LEGACY_KEYS.levels) as UpgradeId[]) {
    levels[id] = Math.max(0, Math.floor(readNumber(LEGACY_KEYS.levels[id]) ?? 0));
  }

  const coins = readNumber(LEGACY_KEYS.coins);
  const energy = readNumber(LEGACY_KEYS.energy);
  const updated = readNumber(LEGACY_KEYS.updated);

  if (coins === null && energy === null) return null;

  return {
    c: Math.max(0, Math.floor(coins ?? 0)),
    e: Math.max(0, Math.floor(energy ?? 0)),
    l: levels,
    u: updated ?? Date.now(),
    v: 2,
  };
};

/**
 * Оборачивает облачный вызов в таймаут.
 * Мост Telegram может не ответить вовсе — тогда ждать бессмысленно,
 * и без таймаута загрузка прогресса (а значит и последующие сохранения)
 * просто не завершится.
 */
const withTimeout = async <T,>(p: Promise<T>, ms = 3000): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('cloudStorage timeout')), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

/**
 * Загружает состояние игрока.
 *
 * Приоритет источников: localStorage → CloudStorage → старый формат.
 * Зеркало важнее облака, потому что в нём может лежать более свежая
 * запись, которую не успел принять CloudStorage перед закрытием.
 * При равных значениях берётся более новое по времени `u`.
 * Старый формат нужен только для миграции прогресса.
 */
export const loadProgress = async (): Promise<ProgressState | null> => {
  let outboxState: ProgressState | null = null;
  try {
    outboxState = parseOutbox(localStorage.getItem(OUTBOX_KEY));
  } catch {
    // localStorage может быть недоступен (приватный режим) — не критично.
  }

  let cloudState: ProgressState | null = null;
  try {
    const items = await withTimeout(cloudStorage.getItems([STATE_KEY]));
    cloudState = sanitizeState(parseRaw(items[STATE_KEY]));
  } catch {
    // CloudStorage недоступен или не ответил — работаем из локального зеркала.
  }

  let best: ProgressState | null = cloudState ?? outboxState;
  if (outboxState && cloudState) {
    // Берём более свежее по времени состояние: это защищает и от отката,
    // и от начисления оффлайн-дохода дважды.
    best = outboxState.u >= cloudState.u ? outboxState : cloudState;
  }

  if (best) return best;

  // Нового формата нет — мигрируем прогресс со старых раздельных ключей.
  try {
    return await readLegacyState();
  } catch {
    return null;
  }
};

/**
 * Сохраняет состояние в localStorage (синхронно) и в CloudStorage.
 *
 * Локальная запись происходит первой и синхронно, поэтому переживает
 * закрытие WebView. Облако обновляется следом; если запрос не доедет,
 * следующий запуск подхватит состояние из outbox.
 */
export const saveProgress = async (state: ProgressState): Promise<boolean> => {
  const payload = JSON.stringify(state);

  try {
    localStorage.setItem(OUTBOX_KEY, payload);
  } catch {
    // localStorage переполнен или недоступен — продолжаем, есть CloudStorage.
  }

  try {
    await cloudStorage.setItem(STATE_KEY, encrypt(payload));
  } catch {
    // Облако недоступно или обрыв — состояние останется в localStorage
    // и будет дослано при следующем запуске приложения.
  }

  // localStorage намеренно НЕ очищаем: он постоянное зеркало, а не
  // временная очередь. Причина — мост Telegram вне Telegram (и при обрыве)
  // резолвится без ошибки, фактически ничего не записав. Если бы мы
  // доверяли такому «успеху» и удаляли зеркало, прогресс стирался бы.
  // При загрузке выбирается более свежая запись из двух источников,
  // поэтому устаревшее зеркало не может испортить актуальные данные.
  return true;
};

/**
 * Отправляет локальное зеркало в CloudStorage.
 *
 * Вызывается при загрузке: если прошлый запуск записал состояние
 * только локально, эта отправка его доливает в облако.
 * Зеркало при этом не удаляется — см. комментарий в saveProgress.
 */
export const syncMirrorToCloud = async (): Promise<boolean> => {
  let pending: ProgressState | null = null;
  try {
    pending = parseOutbox(localStorage.getItem(OUTBOX_KEY));
  } catch {
    return false;
  }
  if (!pending) return true;

  try {
    await withTimeout(
      cloudStorage.setItem(STATE_KEY, encrypt(JSON.stringify(pending))),
    );
    return true;
  } catch {
    return false;
  }
};