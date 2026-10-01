import type { FC } from 'react';

interface TopBarProps {
  level: number;
  progress: number;
}

export const TopBar: FC<TopBarProps> = ({ level, progress }) => {
  const p = Math.min(100, Math.max(0, progress));

  return (
    <div style={{ padding: '12px 16px 4px', position: 'relative', zIndex: 2 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {/* Бейдж уровня */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 'var(--wc-radius-m)',
            background:
              'linear-gradient(135deg, var(--wc-accent) 0%, var(--wc-accent-2) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 800,
            color: 'var(--wc-accent-text)',
            boxShadow: 'var(--wc-shadow-1)',
            flexShrink: 0,
          }}
        >
          {level}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--wc-text)',
              }}
            >
              Уровень {level}
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--wc-text-2)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {Math.round(p)}%
            </span>
          </div>

          {/* Прогресс-полоса */}
          <div
            style={{
              width: '100%',
              height: 8,
              marginTop: 8,
              borderRadius: 0,
              background: 'var(--wc-surface-2)',
              border: 'none',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${p}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--wc-accent), var(--wc-accent-2))',
                borderRadius: 0,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};