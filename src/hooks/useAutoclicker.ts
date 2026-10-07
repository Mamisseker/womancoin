/**
 * Автокликер: сам кликает и копит доход до сбора.
 *
 * Автокликеры в игре не было — завод лишь задумывал его скорость.
 * Теперь он работает всегда, а накопленное лежит до нажатия зелёной
 * кнопки на вкладке «Завод». Копится и в офлайне, поэтому выработка
 * считается по абсолютному времени, а не по тику.
 *
 * Округление: за секунду автокликер даёт меньше микро-единицы, поэтому
 * расчёт раз в секунду с округлением вниз всегда давал бы ноль.
 * Метка времени продвигается ровно на ту длительность, которая
 * дала выплату, а дробный остаток не теряется.
 *
 * Критические клики в автокликер НЕ входят: его выработка должна быть
 * ровной и предсказуемой, а крит остаётся наградой за ручной тап.
 * Энергию автокликер не расходует — она остаётся ресурсом ручного тапа.
 */

import { cloudStorage } from '@tma.js/sdk-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getAutoclickIntervalMs } from '@/lib/factories.ts';

const AUTOCLICK_KEY = 'wc_autoclicker_v1';
const AUTOCLICK_MIRROR_KEY = 'wc_autoclicker_v1_mirror';
/** Ключи прежней выработки заводов — нужно, чтобы не потерять накопленное. */
const LEGACY_KEYS = ['wc_factories_v1', 'wc_factories_v1_mirror'];

const HOUR_MS = 3_600_000;
/** Тик пересчёта выработки. */
const TICK_MS = 1_000;
/**
 * Потолок офлайна: без него приложение, закрытое на сутки,
 * накопило бы месяц дохода.
 */
const MAX_OFFLINE_MS = 12 * HOUR_MS;

export interface AutoclickState {
  /** Накопленный доход, микро-единицы. */
  pending: number;
  /** Метка времени, до которого доход уже посчитан (мс). */
  producedAt: number;
}

interface RawAutoclickState {
  k?: unknown;
  pt?: unknown;
}

const toState = (parsed: unknown): AutoclickState | null => {
  if (typeof parsed !== 'object' || parsed === null) return null;
  const { k, pt } = parsed as RawAutoclickState;
  const pending = Math.floor(Number(k));
  const producedAt = Math.floor(Number(pt));
  if (!Number.isFinite(pending) || !Number.isFinite(producedAt)) return null;
  return { pending: Math.max(0, pending), producedAt: Math.max(0, producedAt) };
};

const readLocal = (key: string): AutoclickState | null => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
    return toState(parsed);
  } catch {
    return null;
  }
};

const writeLocal = (key: string, payload: string): void => {
  try {
    localStorage.setItem(key, payload);
  } catch {
    // зеркало недоступно — пишем только в облако
  }
};

/**
 * Пересчитывает накопленное с учётом прошедшего времени.
 *
 * Возвращает новое состояние и, отдельно, сколько набежало, — это нужно
 * рендеру, чтобы не перерисовывать компонент без изменившегося числа.
 */
export const accrue = (
  state: AutoclickState,
  ratePerHour: number,
  now: number,
): { state: AutoclickState; produced: number } => {
  // Первый запуск: отсчёт начинаем с текущего момента.
  if (state.producedAt === 0) {
    return { state: { pending: state.pending, producedAt: now }, produced: 0 };
  }

  const rawElapsed = Math.max(0, now - state.producedAt);
  const elapsed = Math.min(rawElapsed, MAX_OFFLINE_MS);
  const produced = Math.floor((elapsed * ratePerHour) / HOUR_MS);

  // Израсходованное время = ровно столько, сколько дало выплату.
  const consumed = produced === 0 ? 0 : Math.floor((produced * HOUR_MS) / ratePerHour);
  const producedAt = rawElapsed > MAX_OFFLINE_MS ? now : state.producedAt + consumed;

  return { state: { pending: state.pending + produced, producedAt }, produced };
};

/**
 * Доход автокликера за час при текущей частоте и доходе за клик.
 * Интервал всегда меньше секунды из-за завода, поэтому считаем делением.
 */
export const getRatePerHour = (coinsPerTap: number): number => {
  const intervalMs = getAutoclickIntervalMs();
  return (HOUR_MS / intervalMs) * coinsPerTap;
};

/**
 * @param coinsPerTap доход за клик с учётом заводов и бустов
 * @param onCollect переводит накопленное на баланс
 */
export const useAutoclicker = (coinsPerTap: number, onCollect: (amount: number) => void) => {
  const [pending, setPending] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const stateRef = useRef<AutoclickState>({ pending: 0, producedAt: 0 });
  const collectRef = useRef(onCollect);
  collectRef.current = onCollect;

  // Доход за клик меняется от буста и прокачки, поэтому пересчитываем
  // ставку каждый рендер и держим её в ref для таймера.
  const ratePerHour = useMemo(() => getRatePerHour(coinsPerTap), [coinsPerTap]);
  const rateRef = useRef(ratePerHour);
  rateRef.current = ratePerHour;

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      let stored: AutoclickState | null = null;
      try {
        const raw = (await cloudStorage.getItem(AUTOCLICK_KEY)) ?? '';
        stored = toState(JSON.parse(raw) as unknown);
      } catch {
        // облако недоступно или значение повреждено — берём зеркало
      }
      if (cancelled) return;

      // Старые ключи нужны только один раз, чтобы ничего не потерять.
      let legacy: AutoclickState | null = null;
      for (const key of LEGACY_KEYS) {
        legacy = legacy ?? readLocal(key);
        if (legacy) break;
      }

      const at = Date.now();
      const best = readLocal(AUTOCLICK_MIRROR_KEY) ?? stored ?? legacy;
      const start: AutoclickState = best ?? { pending: 0, producedAt: 0 };
      const { state } = accrue(start, rateRef.current, at);

      stateRef.current = state;
      setPending(state.pending);
      setLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      const { state, produced } = accrue(stateRef.current, rateRef.current, Date.now());
      stateRef.current = state;
      if (produced > 0) setPending(state.pending);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const persist = useCallback((state: AutoclickState) => {
    const payload = JSON.stringify({ k: state.pending, pt: state.producedAt });
    writeLocal(AUTOCLICK_MIRROR_KEY, payload);
    void (async () => {
      try {
        await cloudStorage.setItem(AUTOCLICK_KEY, payload);
      } catch {
        // останется в зеркале, досылается при следующем запуске
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    persist(stateRef.current);
  }, [pending, loaded, persist]);

  /** Забирает весь накопленный доход на счёт. */
  const collect = useCallback((): number => {
    const amount = stateRef.current.pending;
    if (amount <= 0) return 0;
    // Метку времени сохраняем: сбросить её — значит выбросить выработку,
    // набежавшую между тиком и нажатием.
    stateRef.current = { pending: 0, producedAt: Date.now() };
    setPending(0);
    collectRef.current(amount);
    persist(stateRef.current);
    return amount;
  }, [persist]);

  return { pending, collect, loaded, ratePerHour };
};