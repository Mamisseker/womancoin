/**
 * Бусты: временные усиления с кулдауном.
 *
 * Каждый буст живёт в двух фазах:
 *   работа (boostMs) — усиление активно, таймер идёт вниз;
 *   откат (cooldownMs) — буст «остывает», кнопка заблокирована.
 *
 * Состояние живёт отдельно от прогресса (hooks/useBoosts.ts): бусты не
 * должны участвовать в общей атомарной записи баланса — иначе каждый
 * чих буста переписывал бы весь снимок прогресса.
 */

import type { FC } from 'react';
import { motion } from 'framer-motion';

import {
  BOOSTS,
  formatRemaining,
  getBoostPhase,
  getPhaseLeft,
  getPhaseProgress,
  type BoostId,
  type BoostState,
} from '@/lib/boosts.ts';

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
        alignSelf: 'center',
      }}
    >
      {BOOSTS.map((def) => {
        const state = states[def.id] ?? { workUntil: 0, readyAt: 0 };
        const phase = getBoostPhase(state, now);
        const left = getPhaseLeft(state, now);
        const isReady = phase === 'ready';
        const isWork = phase === 'work';
        const isCooling = phase === 'cooldown';

        return (
          <motion.button
            key={def.id}
            type="button"
            title={
              isReady
                ? def.detail
                : `${isWork ? 'Работает' : isCooling ? 'Откат' : 'Готов'}: ${formatRemaining(left)}`
            }
            onClick={() => onActivate(def.id)}
            disabled={!isReady || disabled}
            whileTap={isReady && !disabled ? { scale: 0.93 } : undefined}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            style={{
              position: 'relative',
              width: 76,
              height: 76,
              borderRadius: 'var(--wc-radius-m)',
              border: '1px solid var(--wc-separator)',
              background: isWork
                ? 'linear-gradient(145deg, var(--wc-accent), var(--wc-accent-2))'
                : 'var(--wc-surface)',
              boxShadow: isWork ? '0 8px 22px var(--wc-glow)' : 'var(--wc-shadow-1)',
              opacity: isReady ? 1 : 0.5,
              cursor: isReady && !disabled ? 'pointer' : 'not-allowed',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              padding: 4,
              color: isWork ? 'var(--wc-accent-text)' : 'var(--wc-text)',
              WebkitTapHighlightColor: 'transparent',
              overflow: 'hidden',
            }}
          >
            <span style={{ fontSize: 22, lineHeight: 1 }}>{def.icon}</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                textAlign: 'center',
                lineHeight: 1.15,
              }}
            >
              {def.title}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: isWork ? 'var(--wc-accent-text)' : 'var(--wc-text-3)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {isReady ? def.detail : formatRemaining(left)}
            </span>

            {/* Заливка оставшегося времени фазы снизу вверх */}
            {!isReady && (
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: `${getPhaseProgress(state, def, now) * 100}%`,
                  background: isWork
                    ? 'rgba(255, 255, 255, 0.22)'
                    : 'rgba(255, 184, 0, 0.14)',
                  pointerEvents: 'none',
                }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
};