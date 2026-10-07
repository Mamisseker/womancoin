/**
 * Автокликер: сам кликает и зачисляет доход на баланс.
 *
 * Денег на сборе тут больше нет — зелёная кнопка уступила место сбору
 * улучшений по заводам, поэтому доход уходит на счёт сам, порциями,
 * а не копится до нажатия. Порциями, а не каждый тик: каждый сброс
 * баланса запускает запись прогресса, и раз в полсекунды она бы
 * превратилась в постоянную запись в хранилище.
 *
 * Округление: за секунду автокликер даёт меньше микро-единицы, поэтому
 * расчёт раз в секунду с округлением вниз всегда давал бы ноль.
 * Метка времени продвигается ровно на ту длительность, которая дала
 * выплату, а дробный остаток не теряется.
 *
 * Критические клики в автокликер не входят: его выработка должна быть
 * ровной, а крит остаётся наградой за ручной тап. Энергию автокликер
 * не расходует — она остаётся ресурсом ручного тапа.
 */

import { useCallback, useEffect, useRef } from 'react';

import type { FactoryBonuses } from '@/lib/factories.ts';

const HOUR_MS = 3_600_000;
/** Как часто сбрасываем накопленное на баланс, мс. */
const FLUSH_MS = 10_000;
/** Тик пересчёта выработки, мс. */
const TICK_MS = 500;
/**
 * Потолок офлайна: без него приложение, закрытое на сутки,
 * накопило бы месяц дохода.
 */
const MAX_OFFLINE_MS = 12 * HOUR_MS;

interface AutoclickState {
  pending: number;
  producedAt: number;
}

interface RawAutoclickState {
  k?: unknown;
  pt?: unknown;
}

const readState = (): AutoclickState | null => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem('wc_autoclicker_v2_mirror') ?? 'null');
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { k, pt } = parsed as RawAutoclickState;
    const pending = Math.floor(Number(k));
    const producedAt = Math.floor(Number(pt));
    if (!Number.isFinite(pending) || !Number.isFinite(producedAt)) return null;
    return { pending: Math.max(0, pending), producedAt: Math.max(0, producedAt) };
  } catch {
    return null;
  }
};

/**
 * Пересчитывает накопленное с учётом прошедшего времени.
 *
 * Возвращает состояние и, отдельно, сколько набежало — это нужно
 * рендеру, чтобы не пересчитывать без изменившегося числа.
 */
export const accrue = (
  state: AutoclickState,
  ratePerHour: number,
  now: number,
): { state: AutoclickState; produced: number } => {
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

/** Доход автокликера за час: клики в цикле × доход за клик. */
export const getRatePerHour = (bonuses: FactoryBonuses, coinsPerTap: number): number =>
  (HOUR_MS / bonuses.autoclickIntervalMs) * bonuses.autoclickClicks * coinsPerTap;

/**
 * @param bonuses скорость и количество кликов, задаются заводами
 * @param coinsPerTap доход за один клик, уже с заводами
 * @param credit зачисляет заработанное на баланс
 */
export const useAutoclicker = (
  bonuses: FactoryBonuses,
  coinsPerTap: number,
  credit: (amount: number) => void,
): { ratePerHour: number } => {
  const stateRef = useRef<AutoclickState>({ pending: 0, producedAt: 0 });
  const creditRef = useRef(credit);
  creditRef.current = credit;

  const rateRef = useRef(0);
  rateRef.current = getRatePerHour(bonuses, coinsPerTap);

  // Сбрасывает накопленное на баланс. Вызывается и по таймеру, и при
  // сворачивании: в WebView setTimeout не выполняется, пока приложение
  // свёрнуто, и без явного сброса выработка за это время пропала бы.
  const flush = useCallback(() => {
    const amount = stateRef.current.pending;
    if (amount <= 0) return;
    stateRef.current = { ...stateRef.current, pending: 0 };
    creditRef.current(amount);
    try {
      localStorage.setItem('wc_autoclicker_v2_mirror', JSON.stringify(stateRef.current));
    } catch {
      // зеркало недоступно — следующий запуск досчитает сам
    }
  }, []);

  // Загрузка: подхватываем метку времени прошлого запуска. Сам расчёт
  // не делаем — ставки от заводов к этому моменту ещё не пришли, а
  // досчитает первый тик, когда они загрузятся.
  useEffect(() => {
    const at = Date.now();
    stateRef.current = readState() ?? { pending: 0, producedAt: at };
    localStorage.setItem('wc_autoclicker_v2_mirror', JSON.stringify(stateRef.current));
  }, []);

  // Перед каждой сменой ставки досчитываем по старой: иначе время между
  // загрузкой заводов и пересчётом попало бы по уже изменившейся ставке
  // и доход поехал бы в обе стороны.
  useEffect(() => {
    const at = Date.now();
    if (rateRef.current > 0 && stateRef.current.producedAt > 0) {
      stateRef.current = accrue(stateRef.current, rateRef.current, at).state;
    }
    rateRef.current = getRatePerHour(bonuses, coinsPerTap);
  }, [bonuses, coinsPerTap]);

  // Тик выработки + порционный сброс на баланс.
  useEffect(() => {
    let flushed = Date.now();
    const id = window.setInterval(() => {
      const at = Date.now();
      const { state } = accrue(stateRef.current, rateRef.current, at);
      stateRef.current = state;
      if (at - flushed >= FLUSH_MS) {
        flushed = at;
        flush();
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [flush]);

  // Гарантированный сброс при сворачивании/закрытии.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [flush]);

  return { ratePerHour: getRatePerHour(bonuses, coinsPerTap) };
};