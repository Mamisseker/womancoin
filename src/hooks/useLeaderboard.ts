import { useMemo } from 'react';

import type { Gender } from '@/hooks/useGender';

export interface LeaderEntry {
  id: string;
  name: string;
  /** Образный показатель прокачки — механика ещё не задана. */
  power: number;
  isYou?: boolean;
}

const MALE_DEMO: LeaderEntry[] = [
  { id: 'm1', name: 'Артём', power: 18420 },
  { id: 'm2', name: 'Макс', power: 15110 },
  { id: 'm3', name: 'Данил', power: 12880 },
  { id: 'm4', name: 'Илья', power: 10450 },
  { id: 'm5', name: 'Кирилл', power: 9320 },
  { id: 'm6', name: 'Никита', power: 7810 },
  { id: 'm7', name: 'Егор', power: 6540 },
  { id: 'm8', name: 'Павел', power: 5120 },
];

const FEMALE_DEMO: LeaderEntry[] = [
  { id: 'f1', name: 'Алина', power: 19100 },
  { id: 'f2', name: 'Катя', power: 16240 },
  { id: 'f3', name: 'Маша', power: 13990 },
  { id: 'f4', name: 'Соня', power: 11730 },
  { id: 'f5', name: 'Лера', power: 9860 },
  { id: 'f6', name: 'Настя', power: 8440 },
  { id: 'f7', name: 'Вика', power: 7010 },
  { id: 'f8', name: 'Даша', power: 5680 },
];

const YOU_ID = 'you';

/**
 * Таблица лидеров по полу. Сейчас — демо + текущий игрок.
 * Когда появится прокачка и сервер — заменить источник на fetch.
 */
export const useLeaderboard = (
  gender: Gender,
  youPower: number | null,
): LeaderEntry[] => {
  return useMemo(() => {
    const base = gender === 'male' ? MALE_DEMO : FEMALE_DEMO;
    const rows =
      youPower === null
        ? base
        : [
            ...base,
            {
              id: YOU_ID,
              name: 'Ты',
              power: Math.max(0, youPower),
              isYou: true,
            },
          ];

    return [...rows].sort((a, b) => b.power - a.power);
  }, [gender, youPower]);
};
