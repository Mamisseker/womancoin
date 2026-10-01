/**
 * Панель бустов: три круглые кнопки справа от монеты.
 *
 * Визуально это одна семья с монетой: та же круглая форма, тот же
 * оранжевый градиент в активной фазе и то же сияние. Разница только
 * в размере и в кольце-таймере вокруг кнопки:
 *   работа   — яркое кольцо и градиент, как у монеты;
 *   откат    — приглушённое кольцо, ядро кнопки уходит в фон;
 *   готов    — тонкое серое кольцо, лёгкая оранжевая подсветка ядра.
 * Кольцо читается лучше, чем заливка снизу-вверх, и не спорит с
 * круглой монетой за внимание.
 */

import { motion } from 'framer-motion';
import type { FC } from 'react';

import {
  BOOSTS,
  formatRemaining,
  getBoostPhase,
  getPhaseLeft,
  type BoostId,
  type BoostState,
} from '@/lib/boosts.ts';

const RING_SIZE = 56;

interface BoostsPanelProps {
  states: Record<BoostId, BoostState>;
  /** Текущее время, мс. Обновляется тикером в хуке. */
  now: number;
  onActivate: (id: BoostId) => void;
  /** Заблокировать все бусты (например, во время загрузки прогресса). */
  disabled?: boolean;
}

export const BoostsPanel: FC<BoostsPanelProps> = ({ states, now, onActivate, disabled }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        justifyContent: 'center',
      }}
    >
      {BOOSTS.map((def) => {
        const state = states[def.id] ?? { workUntil: 0, readyAt: 0 };
        const phase = getBoostPhase(state, now);
        const left = getPhaseLeft(state, now);
        const isReady = phase === 'ready';
        const isWork = phase === 'work';
        const canPress = isReady && !disabled;

        // Доля оставшегося времени текущей фазы: кольцо «сгорает» по кругу.
        const total = isWork ? def.workMs : def.cooldownMs;
        const progress =
          isReady ? 0 : Math.min(1, Math.max(0, left / Math.max(1, total)));
        const ringTurn = `${progress}turn`;

        const ring = isReady
          ? 'var(--wc-separator)'
          : isWork
            ? `conic-gradient(var(--wc-accent) ${ringTurn}, rgba(255, 138, 0, 0.16) 0)`
            : `conic-gradient(rgba(255, 184, 0, 0.5) ${ringTurn}, rgba(255, 184, 0, 0.12) 0)`;

        const core = isWork
          ? 'linear-gradient(145deg, var(--wc-accent), var(--wc-accent-2))'
          : isReady
            ? 'linear-gradient(145deg, rgba(255, 184, 0, 0.14), rgba(255, 138, 0, 0.06))'
            : 'var(--wc-surface-2)';

        return (
          <motion.button
            key={def.id}
            type="button"
            title={
              isReady
                ? `${def.title}: ${def.detail}`
                : `${isWork ? 'Работает' : 'Откат'}: ${formatRemaining(left)}`
            }
            onClick={() => onActivate(def.id)}
            disabled={!canPress}
            whileTap={canPress ? { scale: 0.92 } : undefined}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            style={{
              width: 76,
              padding: 0,
              border: 0,
              background: 'transparent',
              cursor: canPress ? 'pointer' : 'default',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 5,
              opacity: disabled ? 0.6 : 1,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {/* Кольцо-таймер и ядро кнопки */}
            <span
              style={{
                position: 'relative',
                width: RING_SIZE,
                height: RING_SIZE,
                display: 'block',
                borderRadius: '50%',
                background: ring,
                boxShadow: isWork
                  ? '0 8px 24px var(--wc-glow)'
                  : 'var(--wc-shadow-1)',
                // Мягкий переход, чтобы смена фазы не мигала.
                transition: 'background 0.3s linear, box-shadow 0.3s ease',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  inset: 3,
                  borderRadius: '50%',
                  background: core,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  lineHeight: 1,
                  filter: isReady ? 'none' : 'grayscale(0.4)',
                  transition: 'background 0.3s linear, filter 0.3s ease',
                }}
              >
                {def.icon}
              </span>
            </span>

            {/* Подпись: имя буста и его эффект/таймер */}
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                lineHeight: 1.1,
                color: 'var(--wc-text)',
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              {def.title}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                lineHeight: 1.1,
                color: isWork ? 'var(--wc-accent)' : 'var(--wc-text-3)',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}
            >
              {isReady ? def.detail : formatRemaining(left)}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};
