/**
 * Данные вкладки «Завод».
 *
 * Отделены от компонента по тому же принципу, что и `UPGRADES` в
 * `useProgress.ts`: карточка только рисует, список — единственный
 * источник правды. Сортировка делается в компоненте, поэтому порядок
 * в этом массиве не важен.
 */

export type FactoryTier = 1 | 2 | 3;

export interface FactoryUpgradeDef {
  id: string;
  icon: string;
  title: string;
  detail: string;
  /** Уровень тапа, с которого карточка открывается. */
  requiredTapLevel: number;
  /** Цена в монетах. По ней же карточки сортируются по умолчанию. */
  baseCost: number;
  tier: FactoryTier;
}

export const TIER_LABELS: Record<FactoryTier, string> = {
  1: 'Смена',
  2: 'Линия',
  3: 'Цех',
};

export const FACTORY_UPGRADES: FactoryUpgradeDef[] = [
  {
    id: 'shift',
    icon: '🕐',
    title: 'Ночная смена',
    detail: '+15% к пассивному доходу за смену',
    requiredTapLevel: 0,
    baseCost: 5_000,
    tier: 1,
  },
  {
    id: 'conveyor',
    icon: '🛠',
    title: 'Конвейер',
    detail: 'Монеты копятся, даже когда тебя нет',
    requiredTapLevel: 2,
    baseCost: 25_000,
    tier: 1,
  },
  {
    id: 'press',
    icon: '⚙️',
    title: 'Пресс',
    detail: '+1 к урону за каждый тап на производстве',
    requiredTapLevel: 4,
    baseCost: 90_000,
    tier: 2,
  },
  {
    id: 'robot',
    icon: '🤖',
    title: 'Робот-упаковщик',
    detail: 'Удваивает пассивный доход',
    requiredTapLevel: 7,
    baseCost: 320_000,
    tier: 2,
  },
  {
    id: 'lab',
    icon: '🧪',
    title: 'Лаборатория',
    detail: 'Реген энергии +20% от базового',
    requiredTapLevel: 10,
    baseCost: 1_200_000,
    tier: 3,
  },
  {
    id: 'satellite',
    icon: '🛰',
    title: 'Спутник-монитор',
    detail: 'Скидка 15% на все улучшения завода',
    requiredTapLevel: 14,
    baseCost: 4_500_000,
    tier: 3,
  },
];