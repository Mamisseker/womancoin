/**
 * Панель бустов: три круглые кнопки справа от монеты.
 *
 * Визуально это одна семья с монетой: та же круглая форма, тот же
 * оранжевый градиент в активной фазе и то же сияние. Разница только
 * в размере и в кольце-таймере вокруг кнопки:
 *   работа   — яркое кольцо и градиент, как у монеты;
 *   заряды   — кольцо показывает, как набирается следующий заряд;
 *   полный   — кольцо замкнуто, все применения готовы.
 * Кольцо читается лучше, чем заливка снизу-вверх, и не спорит с
 * круглой монетой за внимание.
 *
 * Бейдж «×N» показывает стак применений: потратили одно — стало ×2,
 * кончилось — ждём откат, потом снова 1, 2, 3.
 */

import { motion } from 'framer-motion';
import type { FC } from 'react';

import {
  BOOSTS,
  MAX_CHARGES,
  formatRemaining,
  getBoostView,
  getRingProgress,
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
        const state = states[def.id] ?? { charges: 0, workUntil: 0, refillAt: 0 };
        const view = getBoostView(state, now);
        const isWorking = view.working;
        const isEmpty = !isWorking && view.charges <= 0;
        const canPress = !isWorking && view.charges > 0 && !disabled;

        const progress = getRingProgress(view, def);
        const ringTurn = `${progress}turn`;

        const ring = view.charges >= MAX_CHARGES && !isWorking
          ? 'var(--wc-accent)'
          : isWorking
            ? `conic-gradient(var(--wc-accent) ${ringTurn}, rgba(255, 138, 0, 0.16) 0)`
            : isEmpty
              ? `conic-gradient(rgba(255, 184, 0, 0.5) ${ringTurn}, rgba(255, 184, 0, 0.12) 0)`
              : `conic-gradient(var(--wc-accent) ${ringTurn}, rgba(255, 138, 0, 0.16) 0)`;

        const core = isWorking
          ? 'linear-gradient(145deg, var(--wc-accent), var(--wc-accent-2))'
          : isEmpty
            ? 'var(--wc-surface-2)'
            : 'linear-gradient(145deg, rgba(255, 184, 0, 0.14), rgba(255, 138, 0, 0.06))';

        // Подпись под кнопкой: эффект, откат или идущая работа.
        const caption = isWorking
          ? formatRemaining(view.workLeft)
          : isEmpty
            ? formatRemaining(view.refillLeft)
            : def.detail;

        return (
          <motion.button
            key={def.id}
            type="button"
            title={
              isWorking
                ? `${def.title}: работает ${formatRemaining(view.workLeft)}`
                : isEmpty
                  ? `${def.title}: откат ${formatRemaining(view.refillLeft)}`
                  : `${def.title}: ${def.detail} (${view.charges} из ${MAX_CHARGES})`
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
                boxShadow: isWorking
                  ? '0 8px 24px var(--wc-glow)'
                  : 'var(--wc-shadow-1)',
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
                  fontSize: 22,
                  lineHeight: 1,
                  filter: isEmpty ? 'grayscale(0.5)' : 'none',
                  transition: 'background 0.3s linear, filter 0.3s ease',
                }}
              >
                {def.icon}
              </span>

              {/* Бейдж стака применений */}
              <span
                style={{
                  position: 'absolute',
                  top: -5,
                  right: -6,
                  minWidth: 19,
                  height: 19,
                  padding: '0 4px',
                  borderRadius: 100,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 800,
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                  color: view.charges > 0 ? 'var(--wc-accent-text)' : 'var(--wc-text-3)',
                  background:
                    view.charges > 0
                      ? 'var(--wc-accent)'
                      : 'var(--wc-surface-2)',
                  border: '1px solid var(--wc-separator)',
                }}
              >
                ×{view.charges}
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
                color: isWorking
                  ? 'var(--wc-accent)'
                  : isEmpty
                    ? 'var(--wc-text-3)'
                    : 'var(--wc-text-2)',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}
            >
              {caption}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};