/**
 * Заводы игрока.
 *
 * Завод — не источник продукции, а постоянное усиление: каждый из
 * четырёх стартовых заводов уже есть у игрока и работает всегда.
 * Заводы не покупаются и не качаются — их выработка складывается
 * в итоговые бонусы, которые применяются к тапу и автоклику.
 *
 * Бонусы хранятся в микро-единицах и целых процентах (бейсис-поинтах),
 * а не дробными долями: шанс крита и прибавка к тапу участвуют в
 * суммировании, и накопленный float быстро давал бы «0.9999999 %».
 */

import batteryImg from '@/components/FactoryPage/factoryBattery.svg';
import chemImg from '@/components/FactoryPage/factoryChem.svg';
import mintImg from '@/components/FactoryPage/factoryMint.svg';
import techImg from '@/components/FactoryPage/factoryTech.svg';

import { MICRO, MICRO_PER_TAP } from '@/lib/units.ts';

/** Базовая частота автокликера: один клик в секунду. */
export const BASE_AUTOCLICK_MS = 1000;

/** Множитель дохода за критический клик. */
export const CRIT_MULTIPLIER = 2;

export interface FactoryDef {
  id: string;
  /** Название с эмодзи, как его показывает игрок. */
  title: string;
  /** Что завод усиливает, человеческим языком. */
  effect: string;
  image: string;
}

export const FACTORIES: FactoryDef[] = [
  {
    id: 'coin',
    title: '🏭 Монетный завод',
    effect: '+0.0001 к доходу за клик',
    image: mintImg,
  },
  {
    id: 'energy',
    title: '🔋 Энергетический завод',
    effect: '+0.1% к скорости автокликера',
    image: batteryImg,
  },
  {
    id: 'chem',
    title: '🧪 Химический завод',
    effect: '+0.5% к шансу критического клика',
    image: chemImg,
  },
  {
    id: 'tech',
    title: '💻 Техно-завод',
    effect: '+0.0002 к доходу за клик',
    image: techImg,
  },
];

/** Прибавка к доходу за клик от всех заводов, микро-единицы. */
export const FACTORY_TAP_BONUS_MICRO =
  Math.round(0.0001 * MICRO) + Math.round(0.0002 * MICRO); // 100 + 200 = 300

/** Прибавка к скорости автокликера от всех заводов, доля. */
export const FACTORY_AUTOCLICK_BONUS = 0.001; // +0.1%

/** Прибавка к шансу крита от всех заводов, бейсис-поинты (1 бп = 0.01%). */
export const FACTORY_CRIT_BONUS_BPS = 50; // +0.5%

/**
 * Доход за клик с учётом заводов.
 *
 * Заводская прибавка складывается с уроном ДО применения буста
 * «Турбо»: буст должен умножать весь доход за клик целиком,
 * включая то, что дали заводы.
 */
export const getCoinsPerTap = (damageLevel: number, turbo: boolean, turboMult: number): number => {
  const base = MICRO_PER_TAP + damageLevel + FACTORY_TAP_BONUS_MICRO;
  return turbo ? base * turboMult : base;
};

/** Интервал автокликера с учётом завода, мс. */
export const getAutoclickIntervalMs = (): number =>
  BASE_AUTOCLICK_MS / (1 + FACTORY_AUTOCLICK_BONUS);

/** Шанс критического клика в бейсис-поинтах. */
export const getCritChanceBps = (): number => FACTORY_CRIT_BONUS_BPS;

/**
 * Бросок крита.
 *
 * Сравниваем целое число бейсис-поинтов с броском 0..9999, а не
 * умножаем дробь на Math.random(): округление вниз у «0.5%»
 * превращало бы шанс в «никогда».
 */
export const rollCrit = (chanceBps: number, roll: number): boolean =>
  chanceBps > 0 && roll < chanceBps;

/** Сумма прибавок к доходу за клик для подписи на карточке. */
export const formatTapBonus = (): string =>
  `+${(FACTORY_TAP_BONUS_MICRO / MICRO).toFixed(4)}`;