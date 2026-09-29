import { hapticFeedback } from '@tma.js/sdk-react';
import { motion } from 'framer-motion';
import type { FC } from 'react';

import {
  UPGRADES,
  type UpgradeId,
} from '@/hooks/useProgress.ts';

interface UpgradesSectionProps {
  coins: number;
  levels: Record<UpgradeId, number>;
  upgradeCost: (id: UpgradeId) => number;
  buyUpgrade: (id: UpgradeId) => boolean;
}

export const UpgradesSection: FC<UpgradesSectionProps> = ({
  coins,
  levels,
  upgradeCost,
  buyUpgrade,
}) => {
  const handleBuy = (id: UpgradeId) => {
    try {
      hapticFeedback.impactOccurred('medium');
    } catch {
      // хептика недоступна вне Telegram — игнорируем
    }
    buyUpgrade(id);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        width: '100%',
        paddingLeft: 20,
        paddingRight: 20,
        paddingBottom: 24,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 0.5,
          color: 'var(--wc-text-2)',
          textTransform: 'uppercase',
          textAlign: 'left',
        }}
      >
        Прокачка
      </div>

      {UPGRADES.map((def) => {
        const level = levels[def.id];
        const cost = upgradeCost(def.id);
        const affordable = coins >= cost;

        return (
          <div
            key={def.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'var(--wc-surface)',
              border: '2px solid rgba(16,42,20,0.32)',
              borderRadius: 8,
              padding: '12px 14px',
              boxShadow: '0 3px 0 rgba(16,42,20,0.12)',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                background: 'var(--wc-surface-2)',
              }}
            >
              {def.icon}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--wc-text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {def.title}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--wc-accent)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  уро. {level}
                </span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--wc-text-2)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {def.detail}
              </div>
            </div>

            <motion.button
                type="button"
                whileTap={{ scale: 0.93 }}
                onClick={() => handleBuy(def.id)}
                style={{
                  flexShrink: 0,
                  border: '2px solid rgba(16,42,20,0.8)',
                  borderRadius: 6,
                  padding: '8px 12px',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: affordable ? 'pointer' : 'not-allowed',
                  background: affordable ? '#dff0b0' : 'var(--wc-surface-2)',
                  color: affordable ? 'var(--wc-accent)' : 'var(--wc-text-3)',
                  fontVariantNumeric: 'tabular-nums',
                  boxShadow: '0 3px 0 rgba(16,42,20,0.18)',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {cost.toLocaleString('ru-RU')}
              </motion.button>
            </div>
          );
        })}
    </div>
  );
};