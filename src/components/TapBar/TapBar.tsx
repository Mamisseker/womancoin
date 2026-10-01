/**
 * Шкала количества тапов.
 *
 * Полоса наполняется с каждым тапом и обнуляется, когда заполнена
 * целиком. Всего тапов показано числом — оно продолжает копиться
 * и от заполнения не зависит. Подписи «ступень» нет: пользователю
 * достаточно видеть, как растёт шкала.
 */

import type { FC } from 'react';

interface TapBarProps {
  /** Всего тапов за всё время. */
  taps: number;
}

/**
 * Сколько тапов умещается в одно заполнение полосы.
 * Полоса доходит до 100% и начинает заново — чем больше тапов,
 * тем реже это происходит, поэтому шкала не «прыгает» каждый тап.
 */
const TICKS_PER_FILL = 100;

export const TapBar: FC<TapBarProps> = ({ taps }) => {
  const safeTaps = Number.isFinite(taps) ? Math.max(0, Math.floor(taps)) : 0;

  // Позиция внутри текущего цикла: 0..TICKS_PER_FILL.
  const position = safeTaps % TICKS_PER_FILL;

  // Ровно на границе цикла остаток равен нулю, поэтому «полную» полосу
  // показываем явно: иначе шкала перескакивала бы с 99% сразу на 0%,
  // и полное заполнение нигде не было бы видно.
  const isFull = position === 0 && safeTaps > 0;
  const progress = isFull ? 100 : (position / TICKS_PER_FILL) * 100;

  return (
    <div
      style={{
        alignSelf: 'stretch',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
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
            fontSize: 15,
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
          position: 'relative',
          width: '100%',
          height: 12,
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
            // Плавное движение при тапе; в момент сброса полоса не «прыгает».
            transition: 'width 0.18s ease-out',
          }}
        />
      </div>
    </div>
  );
};