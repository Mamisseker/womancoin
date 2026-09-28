import { useEffect, useState, type FC } from 'react';

interface WalletPerk {
  icon: string;
  title: string;
  desc: string;
  status: 'soon';
}

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

const PERKS: WalletPerk[] = [
  {
    icon: '🎨',
    title: 'Эксклюзивные стили монеты',
    desc: 'Кастомные анимации и оформление кнопки тапа',
    status: 'soon',
  },
  {
    icon: '🏆',
    title: 'Особый статус в профиле',
    desc: 'Плашка и рамка для самых активных',
    status: 'soon',
  },
  {
    icon: '⭐',
    title: 'Множитель дохода',
    desc: 'x2 ко всем наградам на 24 часа',
    status: 'soon',
  },
  {
    icon: '🎁',
    title: 'Подарки друзьям',
    desc: 'Отправляй монеты и приколы близким',
    status: 'soon',
  },
];

export const WalletPage: FC = () => {
  const { days, hours, minutes, seconds } = useListingCountdown();

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
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--wc-text-2)',
            maxWidth: 300,
            lineHeight: 1.45,
          }}
        >
          Приколы и бонусы для WomanCoin — стили, статусы, бусты и подарки.
        </div>
      </div>

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
            fontSize: 16,
            fontWeight: 800,
            color: 'var(--wc-text)',
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

      {/* Статус техработ: покупки отключены */}
      <div
        style={{
          alignSelf: 'stretch',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          background: 'var(--wc-accent-soft)',
          border: '1px dashed var(--wc-accent)',
          borderRadius: 18,
          padding: '16px 18px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 26, lineHeight: 1 }}>🛠️</div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: 'var(--wc-text)',
          }}
        >
          Покупки приколов пока закрыты
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--wc-text-2)',
            lineHeight: 1.45,
          }}
        >
          Ведутся технические работы. Как только листинг пройдёт — сможешь
          тратить TON на бонусы прямо здесь.
        </div>
      </div>

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
          Что будет доступно
        </div>

        {PERKS.map((perk) => (
          <div
            key={perk.title}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'var(--wc-surface)',
              border: '1px solid var(--wc-separator)',
              borderRadius: 16,
              padding: '12px 14px',
              boxShadow: 'var(--wc-shadow-1)',
              opacity: 0.55,
              filter: 'saturate(0.6)',
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
              {perk.icon}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--wc-text)',
                }}
              >
                {perk.title}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--wc-text-2)',
                  lineHeight: 1.35,
                }}
              >
                {perk.desc}
              </div>
            </div>

            <div
              style={{
                flexShrink: 0,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.3,
                color: 'var(--wc-text-3)',
                textTransform: 'uppercase',
              }}
            >
              скоро
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};