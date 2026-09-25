import { cloudStorage } from '@tma.js/sdk-react';
import { useCallback, useLayoutEffect, useEffect, useRef, useState } from 'react';

const COINS_KEY = 'wc_coins';
const ENERGY_KEY = 'wc_energy';
const UPDATED_KEY = 'wc_updated';
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
  maxLevel: number;
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
    maxLevel: 20,
  },
  {
    id: 'energy',
    key: 'wc_up_energy',
    icon: '🔋',
    title: 'Макс. энергия',
    detail: '+200 к запасу энергии',
    baseCost: 800,
    growth: 1.38,
    maxLevel: 25,
  },
  {
    id: 'regen',
    key: 'wc_up_regen',
    icon: '⚡',
    title: 'Реген энергии',
    detail: '+12% к скорости восстановления',
    baseCost: 1200,
    growth: 1.36,
    maxLevel: 20,
  },
  {
    id: 'passive',
    key: 'wc_up_passive',
    icon: '💰',
    title: 'Пассивный доход',
    detail: '+40 монет в час',
    baseCost: 2000,
    growth: 1.33,
    maxLevel: 20,
  },
];

const getMaxEnergy = (level: number) => BASE_MAX_ENERGY + level * 200;
const getCoinsPerTap = (level: number) => 1 + level;
const getRegenMs = (level: number) =>
  Math.round(BASE_ENERGY_REGEN_MS / (1 + 0.12 * level));
const getPassivePerHour = (level: number) => level * 40;
const getCost = (def: UpgradeDef, level: number) =>
  Math.round(def.baseCost * Math.pow(def.growth, level));

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
        const keys = [
          COINS_KEY,
          ENERGY_KEY,
          UPDATED_KEY,
          ...UPGRADES.map((u) => u.key),
        ];
        const items = await cloudStorage.getItems(keys);
        if (cancelled) return;

        const readLevel = (key: string): number => {
          const v = items[key] && Number(items[key]);
          return v && !Number.isNaN(v) ? Math.max(0, Math.floor(v)) : 0;
        };
        const nextLevels = {
          damage: readLevel('wc_up_damage'),
          energy: readLevel('wc_up_energy'),
          regen: readLevel('wc_up_regen'),
          passive: readLevel('wc_up_passive'),
        };
        setLevels(nextLevels);

        const max = getMaxEnergy(nextLevels.energy);
        const coinsVal = items[COINS_KEY] && Number(items[COINS_KEY]);
        const updatedVal = items[UPDATED_KEY] ? Number(items[UPDATED_KEY]) : Date.now();

        let nextCoins = 0;
        if (coinsVal && !Number.isNaN(coinsVal)) {
          nextCoins = Math.floor(coinsVal);
        }

        // Пассивный доход за время, пока приложение было закрыто.
        const hours = Math.max(0, (Date.now() - updatedVal) / 3_600_000);
        nextCoins += Math.floor(getPassivePerHour(nextLevels.passive) * hours);

        setCoins(nextCoins);

        // Энергия восстанавливается по времени: к сохранённому значению
        // добавляется реген за секунды, прошедшие с последнего сейва.
        // (Скорость медленная — 1 энергия за 5с без прокачки.)
        const energyVal = items[ENERGY_KEY] ? Number(items[ENERGY_KEY]) : 0;
        if (energyVal && !Number.isNaN(energyVal)) {
          const regen = getRegenMs(nextLevels.regen);
          const elapsed = Math.max(0, Date.now() - updatedVal);
          const regenerated = Math.floor(elapsed / regen);
          const restored = Math.max(0, Math.floor(energyVal)) + regenerated;
          setEnergy(Math.min(max, restored));
        } else {
          setEnergy(max);
        }
      } catch {
        // CloudStorage недоступен (например, вне Telegram) — работаем без сохранения.
      } finally {
        if (!cancelled) {
          loaded.current = true;
        }
      }
    })();

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

  // Мгновенная запись прогресса в CloudStorage (используется при закрытии).
  const write = useCallback(() => {
    const { coins: c, energy: e, levels: l } = stateRef.current;
    void cloudStorage.setItem(COINS_KEY, String(c));
    void cloudStorage.setItem(ENERGY_KEY, String(e));
    void cloudStorage.setItem(UPDATED_KEY, String(Date.now()));
    for (const def of UPGRADES) {
      void cloudStorage.setItem(def.key, String(l[def.id]));
    }
  }, []);

  // Сохранение прогресса в CloudStorage с небольшим дебаунсом на тапы,
  // чтобы не писать хранилище на каждый тап.
  const save = useCallback(() => {
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
    }
    saveTimer.current = window.setTimeout(write, 400);
  }, [write]);

  // Гарантированный сброс при сворачивании/закрытии/обновлении страницы:
  // setTimeout в WebView Telegram не выполняется, если приложение свернули,
  // поэтому «всё скатывается обратно» — записываем значения сразу.
  useEffect(() => {
    const flush = () => {
      if (loaded.current) write();
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', flush);
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
    if (current >= def.maxLevel) return false;

    const cost = getCost(def, current);
    if (stateRef.current.coins < cost) return false;

    const next = { ...levelsRef.current, [id]: current + 1 };
    const nextCoins = stateRef.current.coins - cost;
    setCoins(nextCoins);
    setLevels(next);
    void cloudStorage.setItem(def.key, String(current + 1));
    void cloudStorage.setItem(COINS_KEY, String(nextCoins));
    void cloudStorage.setItem(UPDATED_KEY, String(Date.now()));
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