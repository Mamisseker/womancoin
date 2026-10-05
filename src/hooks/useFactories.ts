/**
 * Заводы: производство и сбор продукции.
 *
 * Каждый завод копит продукцию сам, пока игрок в приложении не стоит,
 * поэтому выработка считается по абсолютному времени, а не по тику.
 * Накопленное хранится одним целым числом микро-единиц — так же, как
 * баланс, чтобы перевод на счёт не терял дробные микро.
 *
 * Важная тонкость с округлением: при округлении «вниз» на каждом тике
 * почти весь доход терялся бы. Микро-единицы в секунду меньше единицы,
 * значит за секунду почти всегда выходит ноль. Поэтому метка времени
 * продвигается ровно на ту длительность, которая дала выплаченные
 * микро-единицы, а остаток (доли микро) остаётся в запасе и
 * реализуется следующими тиками.
 */

import { cloudStorage } from '@tma.js/sdk-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import foundryImg from '@/components/FactoryPage/factoryFoundry.svg';
import mintImg from '@/components/FactoryPage/factoryMint.svg';
import stampImg from '@/components/FactoryPage/factoryStamp.svg';

const FACTORIES_KEY = 'wc_factories_v1';
const FACTORIES_MIRROR_KEY = 'wc_factories_v1_mirror';

const HOUR_MS = 3_600_000;
/** Тик пересчёта выработки. */
const TICK_MS = 1_000;
/**
 * Потолок офлайна: без него приложение, закрытое на сутки,
 * накопило бы месяц выработки. Копим максимум за 12 часов.
 */
const MAX_OFFLINE_MS = 12 * HOUR_MS;

export interface FactoryDef {
  id: string;
  title: string;
  /** Короткое описание выработки. */
  detail: string;
  image: string;
  /** Производительность, микро-единиц в час. */
  ratePerHour: number;
}

export const FACTORIES: FactoryDef[] = [
  {
    id: 'mint',
    title: 'Чеканильный цех',
    detail: 'Чеканит монеты',
    image: mintImg,
    ratePerHour: 200,
  },
  {
    id: 'stamp',
    title: 'Штамповочный цех',
    detail: 'Гнет заготовки',
    image: stampImg,
    ratePerHour: 700,
  },
  {
    id: 'foundry',
    title: 'Литейный цех',
    detail: 'Плавит слитки',
    image: foundryImg,
    ratePerHour: 2_400,
  },
];

/** Суммарная выработка всех заводов, микро-единиц в час. */
export const TOTAL_RATE_PER_HOUR = FACTORIES.reduce(
  (sum, f) => sum + f.ratePerHour,
  0,
);

export interface FactoryState {
  /** Накопленная продукция, микро-единицы. */
  pending: number;
  /** Метка времени, до которой выработка уже посчитана (мс). */
  producedAt: number;
}

interface RawFactoryState {
  k?: unknown;
  pt?: unknown;
}

const readLocal = (): FactoryState | null => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(FACTORIES_MIRROR_KEY) ?? 'null');
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { k, pt } = parsed as RawFactoryState;
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
 * Возвращает новое состояние и фактически израсходованное время:
 * столько микро-единиц удалось посчитать, на столько миллисекунд и
 * двигаем метку. Дробный остаток времени не теряется.
 */
export const accrue = (
  state: FactoryState,
  ratePerHour: number,
  now: number,
): { state: FactoryState; produced: number } => {
  // Первый запуск: отсчёт начинаем от текущего момента.
  if (state.producedAt === 0) {
    return { state: { pending: state.pending, producedAt: now }, produced: 0 };
  }

  const rawElapsed = Math.max(0, now - state.producedAt);
  const elapsed = Math.min(rawElapsed, MAX_OFFLINE_MS);
  const produced = Math.floor((elapsed * ratePerHour) / HOUR_MS);

  // Израсходованное время = ровно столько, сколько дало выплату.
  // Иначе округление вниз съедало бы почти всю выработку.
  const consumed = produced === 0 ? 0 : Math.floor((produced * HOUR_MS) / ratePerHour);
  const producedAt =
    rawElapsed > MAX_OFFLINE_MS ? now : state.producedAt + consumed;

  return {
    state: { pending: state.pending + produced, producedAt },
    produced,
  };
};

export const useFactories = (onCollect: (amount: number) => void) => {
  const [pending, setPending] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const stateRef = useRef<FactoryState>({ pending: 0, producedAt: 0 });
  const collectRef = useRef(onCollect);
  collectRef.current = onCollect;

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      let stored: FactoryState | null = null;
      try {
        const raw = (await cloudStorage.getItem(FACTORIES_KEY)) ?? '';
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null) {
          if (cancelled) return;
          const at = Date.now();
          stateRef.current = { pending: 0, producedAt: at };
          setPending(0);
          setLoaded(true);
          return;
        }
        const { k, pt } = parsed as RawFactoryState;
        const pending = Math.floor(Number(k));
        const producedAt = Math.floor(Number(pt));
        if (Number.isFinite(pending) && Number.isFinite(producedAt)) {
          stored = { pending: Math.max(0, pending), producedAt: Math.max(0, producedAt) };
        }
      } catch {
        // Облако недоступно или значение повреждено — берём зеркало.
      }
      if (cancelled) return;

      const at = Date.now();
      const best = readLocal() ?? stored;
      const start: FactoryState = best ?? { pending: 0, producedAt: 0 };
      const { state } = accrue(start, TOTAL_RATE_PER_HOUR, at);

      stateRef.current = state;
      setPending(state.pending);
      setLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Тик выработки: копим, пока игрок в приложении.
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      const { state, produced } = accrue(stateRef.current, TOTAL_RATE_PER_HOUR, now);
      stateRef.current = state;
      if (produced > 0) setPending(state.pending);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  // Сохранение: зеркало синхронно, облако следом.
  const persist = useCallback((state: FactoryState) => {
    const payload = JSON.stringify({ k: state.pending, pt: state.producedAt });
    try {
      localStorage.setItem(FACTORIES_MIRROR_KEY, payload);
    } catch {
      // Зеркало недоступно — пишем только в облако.
    }
    void (async () => {
      try {
        await cloudStorage.setItem(FACTORIES_KEY, payload);
      } catch {
        // Останется в зеркале, досылается при следующем запуске.
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    persist(stateRef.current);
  }, [pending, loaded, persist]);

  /** Забирает всю накопленную продукцию на счёт. */
  const collect = useCallback((): number => {
    const amount = stateRef.current.pending;
    if (amount <= 0) return 0;
    stateRef.current = { pending: 0, producedAt: Date.now() };
    setPending(0);
    collectRef.current(amount);
    persist(stateRef.current);
    return amount;
  }, [persist]);

  /** Оценка «сколько принесёт за час» — для подписи на кнопке. */
  const perHourLabel = useMemo(() => `${TOTAL_RATE_PER_HOUR}`, []);

  return { pending, collect, loaded, perHourLabel };
};