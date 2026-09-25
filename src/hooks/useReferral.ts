import { cloudStorage, initData } from '@tma.js/sdk-react';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';

const REFERRER_KEY = 'wc_referrer';
const REF_BONUS_KEY = 'wc_ref_bonus';
export const REF_BONUS_AMOUNT = 1000;

export interface ReferralDemoStats {
  friendsCount: number;
  friendsCoins: number;
  friendsActive: number;
}

// Демо-статистика по рефералам: без сервера реальные значения не собрать.
// Когда появится бэкенд — заменить на fetch к эндпоинту.
const DEMO_STATS: ReferralDemoStats = {
  friendsCount: 3,
  friendsCoins: 12450,
  friendsActive: 2,
};

/**
 * Собираем реферальную ссылку и начисляем бонус приглашённому.
 * Пригласивший получает плюшку позже, когда появится общий сервер.
 */
export const buildReferralLink = (userId: number): string =>
  `https://t.me/Wo_Mancoin_bot?start=ref_${userId}`;

const readKey = async (key: string): Promise<string | null> => {
  try {
    const value = await cloudStorage.getItem(key);
    return value || null;
  } catch {
    return null;
  }
};

const writeKey = async (key: string, value: string): Promise<void> => {
  try {
    await cloudStorage.setItem(key, value);
  } catch {
    // CloudStorage недоступен — бонус просто не сохранит отметку.
  }
};

export const useReferral = () => {
  const [invitedBy, setInvitedBy] = useState<string | null>(null);
  const [bonus, setBonus] = useState(0);
  const [usingTelegram, setUsingTelegram] = useState(false);

  const myId = initData.user()?.id ?? null;
  const referralLink = useMemo(
    () => (myId ? buildReferralLink(myId) : ''),
    [myId],
  );

  // Разовый проход при старте: фиксируем реферера и невыплаченный бонус.
  useLayoutEffect(() => {
    let cancelled = false;

    void (async () => {
      setUsingTelegram(true);
      const startParam = initData.startParam() ?? '';
      const refId = startParam.startsWith('ref_') ? startParam.slice(4) : '';

      if (refId) {
        const stored = await readKey(REFERRER_KEY);
        if (!stored) {
          await writeKey(REFERRER_KEY, refId);
        }
        const paid = await readKey(REF_BONUS_KEY);
        if (!cancelled) {
          setInvitedBy(refId);
          if (!paid) {
            setBonus(REF_BONUS_AMOUNT);
          }
        }
      } else {
        const stored = await readKey(REFERRER_KEY);
        if (!cancelled && stored) {
          setInvitedBy(stored);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /** Забирает невыплаченный бонус и помечает его выданным. */
  const claimBonus = useCallback((): number => {
    if (bonus <= 0) return 0;
    const amount = bonus;
    setBonus(0);
    void writeKey(REF_BONUS_KEY, '1');
    return amount;
  }, [bonus]);

  return {
    referralLink,
    invitedBy,
    bonus,
    claimBonus,
    usingTelegram,
    demoStats: DEMO_STATS,
  };
};