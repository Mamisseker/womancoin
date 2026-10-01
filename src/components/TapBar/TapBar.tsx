/**
 * Шкала количества тапов.
 *
 * Показывает, сколько тапов игрок уже сделал, и подсвечивает текущую
 * ступень активности. Числовое значение тапов выводится компактно,
 * крупные цифры баланса остаются в шапке приложения.
 */

import type { FC } from 'react';

interface TapBarProps {
  /** Всего тапов за всё время. */
  taps: number;
}

/** Ступени шкалы: на каждой следующей требуется больше тапов. */
const STEPS = [10, 50, 100, 250, 500, 1000, 2500, 5000] as const;

/** Находим ступень, на которой находится игрок. */
const getStep = (taps: number): { index: number; current: number } => {
  let index = 0;
  for (let i = 0; i < STEPS.length; i += 1) {
    if (taps >= STEPS[i]) index = i;
  }
  return { index, current: STEPS[index] };
};

export const TapBar: FC<TapBarProps> = ({ taps }) => {
  const safeTaps = Number.isFinite(taps) ? Math.max(0, Math.floor(taps)) : 0;
  const { index, current } = getStep(safeTaps);

  // Прогресс внутри текущей ступени: от предыдущей до текущей отметки.
  const previous = index === 0 ? 0 : STEPS[index - 1];
  const span = current - previous;
  const progress = span > 0 ? Math.min(100, ((safeTaps - previous) / span) * 100) : 100;
  const isLast = index === STEPS.length - 1;

  return (
    <div
      style={{
        alignSelf: 'stretch',
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
        background: 'var(--wc-surface)',
        border: '1px solid var(--wc-separator)',
        borderRadius: 18,
        padding: 14,
        boxShadow: 'var(--wc-shadow-1)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.5,
            color: 'var(--wc-text-2)',
            textTransform: 'uppercase',
          }}
        >
          Тапы
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: 'var(--wc-text)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {safeTaps.toLocaleString('ru-RU')}
        </div>
      </div>

      <div
        style={{
          width: '100%',
          height: 8,
          borderRadius: 100,
          background: 'var(--wc-surface-2)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            borderRadius: 100,
            background: 'linear-gradient(90deg, var(--wc-accent), var(--wc-accent-2))',
            transition: 'width 0.25s ease',
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--wc-text-3)',
        }}
      >
        <span>Ступень {index + 1} из {STEPS.length}</span>
        <span>
          {isLast ? 'максимум' : `до ${STEPS[index + 1].toLocaleString('ru-RU')}`}
        </span>
      </div>
    </div>
  );
};