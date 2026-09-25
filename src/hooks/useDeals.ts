import { cloudStorage } from '@tma.js/sdk-react';
import { useCallback, useLayoutEffect, useState } from 'react';

const DEAL_ID_KEY = 'wc_deal_id';
const DEAL_START_KEY = 'wc_deal_start';

export interface DealDef {
  id: string;
  icon: string;
  title: string;
  partner: string;
  partnerIcon: string;
  desc: string;
  durationMs: number;
  reward: number;
}

export const DEALS: DealDef[] = [
  {
    id: 'coffee',
    icon: '☕',
    title: 'Кофейня',
    partner: 'Бармен Саша',
    partnerIcon: '🧔',
    desc: 'Подработка за стойкой наличными',
    durationMs: 1 * 60_000,
    reward: 300,
  },
  {
    id: 'gym',
    icon: '🏋️',
    title: 'Фитнес-зал',
    partner: 'Тренер Лера',
    partnerIcon: '👱‍♀️',
    desc: 'Разовые тренировки «на результат»',
    durationMs: 5 * 60_000,
    reward: 1_400,
  },
  {
    id: 'market',
    icon: '🛒',
    title: 'Продуктовый склад',
    partner: 'Завскладом Пётр',
    partnerIcon: '👨',
    desc: 'Ночные смены, оплата сдельно',
    durationMs: 15 * 60_000,
    reward: 3_500,
  },
  {
    id: 'biz',
    icon: '💼',
    title: 'Сделка с инвесторами',
    partner: 'Инвестор Марина',
    partnerIcon: '👩',
    desc: 'Презентация и «закрытая» встреча',
    durationMs: 60 * 60_000,
    reward: 12_000,
  },
];

export type DealStatus = 'idle' | 'running' | 'ready';

const readStr = async (key: string): Promise<string | null> => {
  try {
    const value = await cloudStorage.getItem(key);
    return value || null;
  } catch {
    return null;
  }
};

const writeStr = async (key: string, value: string): Promise<void> => {
  try {
    await cloudStorage.setItem(key, value);
  } catch {
    // CloudStorage недоступен — прогресс сделки не сохранится между сессиями.
  }
};

/**
 * Механика «заработка» во вкладке Кошелёк: живая сделка с той или иной
 * стороной, которая работает по таймеру и выдаёт награду по завершении.
 * Прогресс хранится в Telegram CloudStorage и переживает перезапуск.
 */
export const useDeals = (addCoins: (n: number) => void) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [startMs, setStartMs] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Восстановление активной сделки из CloudStorage.
  useLayoutEffect(() => {
    let cancelled = false;

    void (async () => {
      const [id, started] = await Promise.all([
        readStr(DEAL_ID_KEY),
        readStr(DEAL_START_KEY),
      ]);
      if (cancelled) return;

      if (id && started && DEALS.some((d) => d.id === id)) {
        setActiveId(id);
        setStartMs(Number(started) || null);
      }
      setLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Тик для обратного отсчёта.
  useLayoutEffect(() => {
    if (!loaded) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [loaded]);

  const active = loaded
    ? DEALS.find((d) => d.id === activeId) ?? null
    : null;
  const status: DealStatus = (() => {
    if (!loaded || !active || startMs === null) return 'idle';
    return Date.now() >= startMs + active.durationMs ? 'ready' : 'running';
  })();

  const remainingMs = active && startMs !== null
    ? Math.max(0, startMs + active.durationMs - now)
    : 0;

  const startDeal = useCallback((id: string) => {
    const def = DEALS.find((d) => d.id === id);
    if (!def) return false;
    setActiveId(def.id);
    const started = Date.now();
    setStartMs(started);
    setNow(started);
    void writeStr(DEAL_ID_KEY, def.id);
    void writeStr(DEAL_START_KEY, String(started));
    return true;
  }, []);

  const claimDeal = useCallback((): number => {
    if (!active || startMs === null) return 0;
    const done = startMs + active.durationMs;
    if (Date.now() < done) return 0;

    addCoins(active.reward);
    setActiveId(null);
    setStartMs(null);
    void writeStr(DEAL_ID_KEY, '');
    return active.reward;
  }, [active, startMs, addCoins]);

  return { deals: DEALS, active, status, remainingMs, startDeal, claimDeal };
};