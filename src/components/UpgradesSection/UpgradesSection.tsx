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
        const maxed = level >= def.maxLevel;
        const cost = upgradeCost(def.id);
        const affordable = !maxed && coins >= cost;

        return (
          <div
            key={def.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'var(--wc-surface)',
              border: '1px solid var(--wc-separator)',
              borderRadius: 16,
              padding: '12px 14px',
              boxShadow: 'var(--wc-shadow-1)',
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
                  }}
                >
                  {level}/{def.maxLevel}
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

            {maxed ? (
              <div
                style={{
                  flexShrink: 0,
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--wc-text-2)',
                }}
              >
                MAX
              </div>
            ) : (
              <motion.button
                type="button"
                whileTap={{ scale: 0.93 }}
                onClick={() => handleBuy(def.id)}
                style={{
                  flexShrink: 0,
                  border: '1px solid var(--wc-accent)',
                  borderRadius: 12,
                  padding: '9px 12px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: affordable ? 'pointer' : 'not-allowed',
                  background: affordable ? 'var(--wc-accent)' : 'var(--wc-surface-2)',
                  color: affordable ? 'var(--wc-accent-text)' : 'var(--wc-text-3)',
                  fontVariantNumeric: 'tabular-nums',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {cost.toLocaleString('ru-RU')}
              </motion.button>
            )}
          </div>
        );
      })}
    </div>
  );
};