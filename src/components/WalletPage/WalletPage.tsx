import { useEffect, useState, type FC } from 'react';

// Заглушка: отсчёт до листинга (7 дней с момента открытия вкладки).
const LISTING_DAYS = 7;
const oneDayMs = 86_400_000;

const pad = (n: number): string => String(n).padStart(2, '0');

const useListingCountdown = () => {
  const [target] = useState(() => Date.now() + LISTING_DAYS * oneDayMs);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / oneDayMs);
  const hours = Math.floor((diff % oneDayMs) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);

  return { days, hours: pad(hours), minutes: pad(minutes), seconds: pad(seconds) };
};

export const WalletPage: FC = () => {
  const { days, hours, minutes, seconds } = useListingCountdown();

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: 24,
        paddingRight: 24,
        position: 'relative',
        zIndex: 1,
        overflow: 'hidden',
      }}
    >
      {/* Скоро листинг: таймер-заглушка */}
      <div
        style={{
          alignSelf: 'stretch',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          background: 'linear-gradient(145deg, var(--wc-accent-soft), transparent)',
          border: '1px solid var(--wc-accent)',
          borderRadius: 18,
          padding: '18px 18px 20px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 28, lineHeight: 1 }}>🚀</div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: 'var(--wc-text)',
            letterSpacing: -0.5,
          }}
        >
          Скоро листинг
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 8,
            alignItems: 'center',
          }}
        >
          {[days, hours, minutes, seconds].map((value, idx) => {
            const labels = ['дн', 'час', 'мин', 'сек'];
            return (
              <div
                key={labels[idx]}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <div
                  style={{
                    minWidth: 48,
                    padding: '8px 6px',
                    borderRadius: 12,
                    background: 'var(--wc-surface)',
                    border: '1px solid var(--wc-separator)',
                    fontSize: 20,
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--wc-accent-text)',
                    textAlign: 'center',
                    boxShadow: 'var(--wc-shadow-1)',
                  }}
                >
                  {value}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: 0.3,
                    color: 'var(--wc-text-3)',
                    textTransform: 'uppercase',
                  }}
                >
                  {labels[idx]}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--wc-text-2)',
            lineHeight: 1.4,
            maxWidth: 280,
          }}
        >
          Монета выходит на биржу. Как только листинг начнётся — увидишь его
          здесь первым.
        </div>
      </div>
    </div>
  );
};