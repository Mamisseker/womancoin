import { cloudStorage } from '@tma.js/sdk-react';
import { useCallback, useLayoutEffect, useEffect, useRef, useState } from 'react';

const COINS_KEY = 'wc_coins';
const ENERGY_KEY = 'wc_energy';
const UPDATED_KEY = 'wc_updated';
const MAX_ENERGY = 1000;
// Энергия восстанавливается на 1 тап каждые 1.5с.
const ENERGY_REGEN_MS = 1500;

/**
 * Хранит прогресс пользователя в Telegram CloudStorage.
 * Монеты и энергия сохраняются за каждым пользователем на серверах Telegram,
 * поэтому прогресс не сбрасывается между сессиями.
 */
export const useProgress = () => {
  const [coins, setCoins] = useState(0);
  const [energy, setEnergy] = useState(MAX_ENERGY);
  const loaded = useRef(false);
  const saveTimer = useRef<number | null>(null);

  // Загрузка сохранённого прогресса.
  useLayoutEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const items = await cloudStorage.getItems([COINS_KEY, ENERGY_KEY, UPDATED_KEY]);
        if (cancelled) return;

        const coinsVal = items[COINS_KEY] && Number(items[COINS_KEY]);
        const energyVal = items[ENERGY_KEY] && Number(items[ENERGY_KEY]);
        const updatedVal = items[UPDATED_KEY] ? Number(items[UPDATED_KEY]) : Date.now();

        if (coinsVal && !Number.isNaN(coinsVal)) {
          setCoins(Math.floor(coinsVal));
        }
        if (energyVal && !Number.isNaN(energyVal)) {
          const passed = Math.floor((Date.now() - updatedVal) / ENERGY_REGEN_MS);
          const restored = Math.max(0, energyVal);
          setEnergy(Math.min(MAX_ENERGY, restored + passed));
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

  // Регенерация энергии в реальном времени.
  useEffect(() => {
    const id = window.setInterval(() => {
      setEnergy((e) => Math.min(MAX_ENERGY, e + 1));
    }, ENERGY_REGEN_MS);
    return () => window.clearInterval(id);
  }, []);

  // Сохранение прогресса в CloudStorage (с дебаунсом на тапы).
  const save = useCallback((c: number, e: number) => {
    if (!loaded.current) return;

    const write = () => {
      void cloudStorage.setItem(COINS_KEY, String(c));
      void cloudStorage.setItem(ENERGY_KEY, String(e));
      void cloudStorage.setItem(UPDATED_KEY, String(Date.now()));
    };

    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
    }
    saveTimer.current = window.setTimeout(write, 700);
  }, []);

  // Сейв при каждом изменении монет/энергии.
  useEffect(() => {
    if (loaded.current) {
      save(coins, energy);
    }
  }, [coins, energy, save]);

  const tap = useCallback(() => {
    setCoins((c) => c + 1);
    setEnergy((e) => Math.max(0, e - 1));
  }, []);

  const addCoins = useCallback((amount: number) => {
    setCoins((c) => c + amount);
  }, []);

  return { coins, energy, tap, addCoins };
};