// Порог первого уровня, с которого начинается геометрическая прогрессия:
// уровень 2 требует LEVEL_BASE монет, уровень 3 — LEVEL_BASE*2,
// уровень 4 — LEVEL_BASE*4 и так далее (множитель 2).
const LEVEL_BASE = 1000;
export const MAX_PLAYER_LEVEL = 1000;

export interface LevelInfo {
  level: number;
  progress: number;
}

/**
 * Считает уровень игрока по количеству монет.
 * Порог уровня N (N >= 2): LEVEL_BASE * 2^(N-2).
 * Прогресс — процент пути от текущего порога к следующему.
 */
export const getLevelInfo = (coins: number): LevelInfo => {
  if (coins < LEVEL_BASE) {
    return { level: 1, progress: (coins / LEVEL_BASE) * 100 };
  }

  const rawLevel = Math.floor(Math.log2(coins / LEVEL_BASE)) + 2;
  const level = Math.min(MAX_PLAYER_LEVEL, rawLevel);

  if (level >= MAX_PLAYER_LEVEL) {
    return { level, progress: 100 };
  }

  const current = LEVEL_BASE * Math.pow(2, level - 2);
  const next = LEVEL_BASE * Math.pow(2, level - 1);
  const progress = Math.min(100, Math.max(0, ((coins - current) / (next - current)) * 100));
  return { level, progress };
};