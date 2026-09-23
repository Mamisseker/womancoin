import { useMemo } from 'react';

export interface GenderStats {
  male: number;
  female: number;
}

// Демо-данные: пока нет общего сервера, показываем заглушку.
// Когда появится бэкенд со статистикой — заменить на fetch к эндпоинту.
const DEMO_STATS: GenderStats = { male: 54, female: 46 };

/**
 * Общая статистика «мужчины vs женщины».
 * Сейчас — фиксированная заглушка; позже подключаем реальный сервер.
 */
export const useGenderStats = () => {
  return useMemo<GenderStats>(() => DEMO_STATS, []);
};

/** Кто сейчас «впереди» на основе статистики. */
export const whoLeads = (stats: GenderStats): 'male' | 'female' => {
  return stats.male > stats.female ? 'male' : 'female';
};