import { cloudStorage } from '@tma.js/sdk-react';
import { useCallback, useLayoutEffect, useState } from 'react';

export type Gender = 'male' | 'female';

const GENDER_KEY = 'wc_gender';

/**
 * Выбор пола игрока. Сохраняется в Telegram CloudStorage, поэтому
 * не сбрасывается между сессиями. Когда появится сервер со статистикой,
 * значение можно будет отправлять туда (в useGenderStats).
 */
export const useGender = () => {
  const [gender, setGenderState] = useState<Gender | null>(null);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    let cancelled = false;

    void (async () => {
      const timeout = window.setTimeout(() => {
        if (!cancelled) setReady(true);
      }, 800);

      try {
        const value = await cloudStorage.getItem(GENDER_KEY);
        if (!cancelled && (value === 'male' || value === 'female')) {
          setGenderState(value);
        }
      } catch {
        // CloudStorage недоступен (например, вне Telegram) — оставляем экран выбора.
      } finally {
        window.clearTimeout(timeout);
        if (!cancelled) {
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setGender = useCallback((g: Gender) => {
    setGenderState(g);
    void cloudStorage.setItem(GENDER_KEY, g);
  }, []);

  return { gender, setGender, ready };
};