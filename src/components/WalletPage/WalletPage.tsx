import { hapticFeedback } from '@tma.js/sdk-react';
import { motion } from 'framer-motion';
import type { FC } from 'react';

import { useDeals } from '@/hooks/useDeals.ts';

interface WalletPageProps {
  coins: number;
  addCoins: (n: number) => void;
}

const formatMs = (ms: number): string => {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
};

const formatDuration = (ms: number): string => {
  const total = Math.round(ms / 60_000);
  if (total >= 60) {
    const h = Math.floor(total / 60);
    const m = total % 60;
    return m ? `${h} ч ${m} мин` : `${h} ч`;
  }
  return `${total} мин`;
};

export const WalletPage: FC<WalletPageProps> = ({ coins, addCoins }) => {
  const { deals, active, status, remainingMs, startDeal, claimDeal } =
    useDeals(addCoins);

  const handleStart = (id: string) => {
    try {
      hapticFeedback.impactOccurred('medium');
    } catch {
      // хептика недоступна вне Telegram — игнорируем
    }
    startDeal(id);
  };

  const handleClaim = () => {
    try {
      hapticFeedback.notificationOccurred('success');
    } catch {
      // хептика недоступна вне Telegram — игнорируем
    }
    claimDeal();
  };

  const progress = active
    ? Math.min(100, Math.round((1 - remainingMs / active.durationMs) * 100))
    : 0;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        paddingTop: 32,
        paddingLeft: 24,
        paddingRight: 24,
        paddingBottom: 24,
        position: 'relative',
        zIndex: 1,
        overflowY: 'auto',
        overscrollBehavior: 'contain',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 40, lineHeight: 1 }}>👛</div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: 'var(--wc-text)',
            letterSpacing: -0.5,
          }}
        >
          Кошелёк
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            fontSize: 28,
            fontWeight: 800,
            color: 'var(--wc-accent)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          🪙 {coins.toLocaleString('ru-RU')}
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--wc-text-2)',
            maxWidth: 300,
            lineHeight: 1.45,
          }}
        >
          Договаривайся о подработках и сделках — каждая приносит монеты, пока
          ты тапаешь.
        </div>
      </div>

      {status === 'running' && active && (
        <div
          style={{
            alignSelf: 'stretch',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            background: 'var(--wc-accent-soft)',
            border: '1px solid var(--wc-separator)',
            borderRadius: 18,
            padding: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span style={{ fontSize: 24 }}>{active.icon}</span>
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'var(--wc-text)',
                  }}
                >
                  {active.title}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--wc-text-2)',
                  }}
                >
                  {active.partnerIcon} {active.partner}
                </div>
              </div>
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: 'var(--wc-accent)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              ⏱ {formatMs(remainingMs)}
            </div>
          </div>

          <div
            style={{
              height: 8,
              borderRadius: 100,
              background: 'var(--wc-surface-2)',
              overflow: 'hidden',
            }}
          >
            <motion.div
              animate={{ width: `${progress}%` }}
              transition={{ ease: 'linear', duration: 1 }}
              style={{
                height: '100%',
                borderRadius: 100,
                background: 'linear-gradient(90deg, var(--wc-accent), var(--wc-accent-2))',
              }}
            />
          </div>
        </div>
      )}

      {status === 'ready' && active && (
        <div
          style={{
            alignSelf: 'stretch',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            background: 'var(--wc-accent-soft)',
            border: '1px solid var(--wc-accent)',
            borderRadius: 18,
            padding: 18,
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--wc-text)',
              textAlign: 'center',
            }}
          >
            {active.partnerIcon} {active.partner} перевёл оплату
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={handleClaim}
            style={{
              border: 0,
              borderRadius: 14,
              padding: '13px 28px',
              fontSize: 15,
              fontWeight: 800,
              cursor: 'pointer',
              background: 'linear-gradient(145deg, var(--wc-accent), var(--wc-accent-2))',
              color: 'var(--wc-accent-text)',
              boxShadow: 'var(--wc-shadow-1)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Забрать 🪙 {active.reward.toLocaleString('ru-RU')}
          </motion.button>
        </div>
      )}

      <div
        style={{
          alignSelf: 'stretch',
          display: 'flex',
          flexDirection: 'column',
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
          Предложения
        </div>

        {deals.map((deal) => {
          const isActive = active?.id === deal.id;
          const disabled = status === 'running' && !isActive;
          const done = isActive && status === 'ready';

          return (
            <div
              key={deal.id}
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
                {deal.icon}
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
                  {deal.title}
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
                  {deal.partnerIcon} {deal.partner} · {deal.desc}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--wc-text-3)',
                  }}
                >
                  ⏱ {formatDuration(deal.durationMs)} · 🪙{' '}
                  {deal.reward.toLocaleString('ru-RU')}
                </div>
              </div>

              {done ? (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.93 }}
                  onClick={handleClaim}
                  style={{
                    flexShrink: 0,
                    border: 0,
                    borderRadius: 12,
                    padding: '9px 12px',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                    background: 'var(--wc-accent)',
                    color: 'var(--wc-accent-text)',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Забрать
                </motion.button>
              ) : isActive ? (
                <div
                  style={{
                    flexShrink: 0,
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--wc-accent)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  ⏱ {formatMs(remainingMs)}
                </div>
              ) : (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.93 }}
                  onClick={() => handleStart(deal.id)}
                  disabled={disabled}
                  style={{
                    flexShrink: 0,
                    border: '1px solid var(--wc-accent)',
                    borderRadius: 12,
                    padding: '9px 12px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    background: disabled ? 'var(--wc-surface-2)' : 'var(--wc-accent)',
                    color: disabled ? 'var(--wc-text-3)' : 'var(--wc-accent-text)',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Взять
                </motion.button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};