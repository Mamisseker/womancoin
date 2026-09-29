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
            borderRadius: 6,
            background: 'linear-gradient(135deg, #9fd14a 0%, #eef6d2 45%, #c5e878 100%)',
            border: '3px solid rgba(16,42,20,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 800,
            color: 'var(--wc-accent)',
            boxShadow: '0 3px 0 rgba(16,42,20,0.25)',
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
              background: 'rgba(16,42,20,0.12)',
              border: '1px solid rgba(16,42,20,0.32)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${p}%`,
                height: '100%',
                background: 'repeating-linear-gradient(90deg, var(--wc-accent) 0 6px, var(--wc-accent-2) 6px 12px)',
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