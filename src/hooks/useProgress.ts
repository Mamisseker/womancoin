import { useCallback, useLayoutEffect, useEffect, useRef, useState } from 'react';

import {
  loadProgress,
  saveProgress,
  syncMirrorToCloud,
  type ProgressState,
} from '@/lib/progressStorage.ts';

const BASE_MAX_ENERGY = 1000;
// Базовая скорость регена: 1 энергия за 5 секунд (без прокачки).
const BASE_ENERGY_REGEN_MS = 5000;
// Пассивный доход начисляется раз в минуту, пока приложение открыто.
const PASSIVE_TICK_MS = 60_000;

export type UpgradeId = 'damage' | 'energy' | 'regen' | 'passive';

export interface UpgradeDef {
  id: UpgradeId;
  key: string;
  icon: string;
  title: string;
  detail: string;
  baseCost: number;
  growth: number;
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'damage',
    key: 'wc_up_damage',
    icon: '💪',
    title: 'Урон за тап',
    detail: '+1 монета за каждый тап',
    baseCost: 500,
    growth: 1.38,
  },
  {
    id: 'energy',
    key: 'wc_up_energy',
    icon: '🔋',
    title: 'Макс. энергия',
    detail: '+200 к запасу энергии',
    baseCost: 800,
    growth: 1.38,
  },
  {
    id: 'regen',
    key: 'wc_up_regen',
    icon: '⚡',
    title: 'Реген энергии',
    detail: '+12% к скорости восстановления',
    baseCost: 1200,
    growth: 1.36,
  },
  {
    id: 'passive',
    key: 'wc_up_passive',
    icon: '💰',
    title: 'Пассивный доход',
    detail: '+40 монет в час',
    baseCost: 2000,
    growth: 1.33,
  },
];

const getMaxEnergy = (level: number) => BASE_MAX_ENERGY + level * 200;
const getCoinsPerTap = (level: number) => 1 + level;
const getRegenMs = (level: number) =>
  Math.round(BASE_ENERGY_REGEN_MS / (1 + 0.12 * level));
const getPassivePerHour = (level: number) => level * 40;
// До мягкого капа цена растёт плавно, после — резко дорожает.
const SOFT_CAP = 10;
const HARD_GROWTH_FACTOR = 1.55;
const getCost = (def: UpgradeDef, level: number): number => {
  if (level < SOFT_CAP) {
    return Math.round(def.baseCost * Math.pow(def.growth, level));
  }
  const capCost = Math.round(def.baseCost * Math.pow(def.growth, SOFT_CAP));
  const hardGrowth = def.growth * HARD_GROWTH_FACTOR;
  return Math.round(capCost * Math.pow(hardGrowth, level - SOFT_CAP));
};

const initialLevels = (): Record<UpgradeId, number> => ({
  damage: 0,
  energy: 0,
  regen: 0,
  passive: 0,
});

/**
 * Хранит прогресс и прокачки пользователя в Telegram CloudStorage.
 * Монеты, энергия и уровни скиллов сохраняются на серверах Telegram,
 * поэтому прогресс не сбрасывается между сессиями.
 */
export const useProgress = () => {
  const [coins, setCoins] = useState(0);
  const [energy, setEnergy] = useState(BASE_MAX_ENERGY);
  const [levels, setLevels] = useState<Record<UpgradeId, number>>(initialLevels);
  const loaded = useRef(false);
  const saveTimer = useRef<number | null>(null);
  // Актуальные значения для мгновенной записи при сворачивании/закрытии.
  const stateRef = useRef({ coins: 0, energy: BASE_MAX_ENERGY, levels: initialLevels() });
  stateRef.current = { coins, energy, levels };
  const levelsRef = useRef(levels);
  levelsRef.current = levels;

  // Производные значения прокачек.
  const coinsPerTap = getCoinsPerTap(levels.damage);
  const maxEnergy = getMaxEnergy(levels.energy);
  const regenMs = getRegenMs(levels.regen);
  const passivePerHour = getPassivePerHour(levels.passive);
  const upgradeCost = (id: UpgradeId): number => {
    const def = UPGRADES.find((u) => u.id === id);
    return def ? getCost(def, levels[id]) : 0;
  };

  // Загрузка сохранённого прогресса.
  useLayoutEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const saved: ProgressState | null = await loadProgress();
        if (cancelled) return;

        if (!saved) {
          // Первый запуск (или прогресс не найден): стартуем с нуля
          // и сразу фиксируем это в хранилище.
          const fresh: ProgressState = {
            c: 0,
            e: BASE_MAX_ENERGY,
            l: initialLevels(),
            u: Date.now(),
            v: 2,
          };
          setLevels(fresh.l);
          setCoins(0);
          setEnergy(BASE_MAX_ENERGY);
          void saveProgress(fresh);
          return;
        }

        setLevels(saved.l);

        const max = getMaxEnergy(saved.l.energy);
        const elapsed = Math.max(0, Date.now() - saved.u);

        // Пассивный доход за время, пока приложение было закрыто.
        const hours = elapsed / 3_600_000;
        const nextCoins = saved.c + Math.floor(getPassivePerHour(saved.l.passive) * hours);
        setCoins(nextCoins);

        // Энергия восстанавливается по времени: к сохранённому значению
        // добавляется реген за секунды, прошедшие с последнего сейва.
        // (Скорость медленная — 1 энергия за 5с без прокачки.)
        const regen = getRegenMs(saved.l.regen);
        const restored = saved.e + Math.floor(elapsed / regen);
        setEnergy(Math.min(max, restored));

        // Фиксируем момент применения оффлайн-начислений: отметка `u`
        // теперь соответствует состоянию, которое уже отдано игроку.
        // Без этого закрытие сразу после открытия привело бы к повторному
        // начислению оффлайн-дохода и энергии при следующем запуске.
        void saveProgress({
          c: nextCoins,
          e: Math.min(max, restored),
          l: saved.l,
          u: Date.now(),
          v: 2,
        });
      } catch {
        // CloudStorage недоступен (например, вне Telegram) — работаем без сохранения.
      } finally {
        if (!cancelled) {
          loaded.current = true;
        }
      }
    })();

    // Доливаем в облако состояние, если прошлый запуск успел записать
    // его только локально (облако было недоступно в момент закрытия).
    void syncMirrorToCloud();

    return () => {
      cancelled = true;
    };
  }, []);

  // Регенерация энергии — таймер пересоздаётся при изменении уровня регена.
  useEffect(() => {
    const id = window.setInterval(() => {
      setEnergy((e) => Math.min(getMaxEnergy(levelsRef.current.energy), e + 1));
    }, regenMs);
    return () => window.clearInterval(id);
  }, [regenMs]);

  // Пассивный доход в реальном времени (минута за минутой).
  useEffect(() => {
    if (!loaded.current) return;
    const id = window.setInterval(() => {
      const perTick = getPassivePerHour(levelsRef.current.passive) / 60;
      if (perTick >= 1) {
        setCoins((c) => c + Math.floor(perTick));
      }
    }, PASSIVE_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  // Запись прогресса одним атомарным ключом (см. lib/progressStorage.ts).
  // Сначала синхронно в localStorage, затем в CloudStorage — так состояние
  // переживает закрытие WebView, даже если облачный запрос не успел уйти.
  const write = useCallback(() => {
    const { coins: c, energy: e, levels: l } = stateRef.current;
    const snapshot: ProgressState = {
      c,
      e,
      l,
      u: Date.now(),
      v: 2,
    };
    stateRef.current = { coins: c, energy: e, levels: l };
    return saveProgress(snapshot);
  }, []);

  // Сохранение прогресса с небольшим дебаунсом на тапы, чтобы не писать
  // хранилище на каждый тап. Запись идёт в localStorage синхронно, поэтому
  // даже если облачный запрос не успеет, состояние переживёт перезагрузку.
  const save = useCallback(() => {
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
    }
    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = null;
      void write();
    }, 400);
  }, [write]);

  // Гарантированный сброс при сворачивании/закрытии/обновлении страницы:
  // setTimeout в WebView Telegram не выполняется, если приложение свернули,
  // поэтому «всё скатывается обратно» — записываем значения сразу.
  // Отменяем и отложенный таймер, иначе он потом перезапишет снимок,
  // сделанный в момент закрытия, данными, которые к тому моменту устарели.
  useEffect(() => {
    const flush = () => {
      if (!loaded.current) return;
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      void write();
    };
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
  }, [write]);

  // Сейв при каждом изменении монет/энергии.
  useEffect(() => {
    if (loaded.current) {
      save();
    }
  }, [coins, energy, levels, save]);

  const tap = useCallback(() => {
    setCoins((c) => c + getCoinsPerTap(levelsRef.current.damage));
    setEnergy((e) => Math.max(0, e - 1));
  }, []);

  const addCoins = useCallback((amount: number) => {
    setCoins((c) => c + amount);
  }, []);

  const buyUpgrade = useCallback((id: UpgradeId): boolean => {
    const def = UPGRADES.find((u) => u.id === id);
    if (!def) return false;
    const current = levelsRef.current[id];

    const cost = getCost(def, current);
    if (stateRef.current.coins < cost) return false;

    const next = { ...levelsRef.current, [id]: current + 1 };
    const nextCoins = stateRef.current.coins - cost;
    setCoins(nextCoins);
    setLevels(next);

    // Покупка сохраняется сразу и целиком: раньше уровень, монеты и
    // отметка времени писались тремя отдельными запросами, и обрыв любого
    // из них на закрытии оставлял прокачку «наполовину» — визуально откат.
    stateRef.current = { coins: nextCoins, energy: stateRef.current.energy, levels: next };
    void saveProgress({
      c: nextCoins,
      e: stateRef.current.energy,
      l: next,
      u: Date.now(),
      v: 2,
    });
    return true;
  }, []);

  return {
    coins,
    energy,
    tap,
    addCoins,
    levels,
    maxEnergy,
    coinsPerTap,
    regenMs,
    passivePerHour,
    upgradeCost,
    buyUpgrade,
  };
};