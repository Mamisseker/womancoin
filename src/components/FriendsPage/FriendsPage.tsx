import { hapticFeedback } from '@tma.js/sdk-react';
import { useCallback, useState, type FC } from 'react';

import demoAvatars from '@/components/FriendsPage/friends-demo-avatars';
import type { ReferralDemoStats } from '@/hooks/useReferral';

interface FriendsPageProps {
  referralLink: string;
  usingTelegram: boolean;
  invitedBy: string | null;
  demoStats: ReferralDemoStats;
}

export const FriendsPage: FC<FriendsPageProps> = ({
  referralLink,
  usingTelegram,
  invitedBy,
  demoStats,
}) => {
  const [copied, setCopied] = useState(false);

  const copyLink = useCallback(async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      hapticFeedback.notificationOccurred('success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      hapticFeedback.notificationOccurred('error');
    }
  }, [referralLink]);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingLeft: 24,
        paddingRight: 24,
        paddingTop: 24,
        gap: 20,
        position: 'relative',
        zIndex: 1,
        overflowY: 'auto',
        overscrollBehavior: 'contain',
      }}
    >
      {invitedBy && (
        <div
          style={{
            alignSelf: 'stretch',
            textAlign: 'center',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--wc-accent)',
            background: 'var(--wc-accent-soft)',
            padding: '10px 16px',
            borderRadius: 14,
          }}
        >
          👋 Тебя пригласил игрок {invitedBy}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div style={{ fontSize: 30, lineHeight: 1 }}>👥</div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: 'var(--wc-text)',
            letterSpacing: -0.4,
          }}
        >
          Друзья
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--wc-text-2)',
            lineHeight: 1.45,
            maxWidth: 280,
            textAlign: 'center',
          }}
        >
          Приглашай друзей — вы оба получите бонус монетами 🪙
        </div>
      </div>

      <div
        style={{
          alignSelf: 'stretch',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            background: 'var(--wc-surface)',
            border: '1px solid var(--wc-separator)',
            borderRadius: 18,
            padding: 14,
            boxShadow: 'var(--wc-shadow-1)',
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
            Твоя ссылка
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--wc-text)',
              wordBreak: 'break-all',
              lineHeight: 1.35,
              opacity: usingTelegram ? 1 : 0.5,
            }}
          >
            {referralLink}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={() => {
                void copyLink();
              }}
              disabled={!referralLink}
              style={{
                flex: 1,
                border: 0,
                borderRadius: 12,
                padding: '11px 0',
                fontSize: 14,
                fontWeight: 700,
                cursor: referralLink ? 'pointer' : 'not-allowed',
                background: 'var(--wc-accent)',
                color: 'var(--wc-accent-text)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {copied ? '✓ Скопировано' : 'Скопировать'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (referralLink) {
                  void copyLink();
                }
              }}
              disabled={!referralLink}
              style={{
                flex: 1,
                border: '1px solid var(--wc-separator)',
                borderRadius: 12,
                padding: '11px 0',
                fontSize: 14,
                fontWeight: 700,
                cursor: referralLink ? 'pointer' : 'not-allowed',
                background: 'var(--wc-surface-2)',
                color: 'var(--wc-text)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {copied ? '✓ Готово' : 'Поделиться'}
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
          }}
        >
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              background: 'var(--wc-surface)',
              border: '1px solid var(--wc-separator)',
              borderRadius: 18,
              padding: '14px 8px',
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--wc-text)' }}>
              {demoStats.friendsCount}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--wc-text-2)' }}>
              друзей
            </div>
          </div>
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              background: 'var(--wc-surface)',
              border: '1px solid var(--wc-separator)',
              borderRadius: 18,
              padding: '14px 8px',
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--wc-text)' }}>
              {demoStats.friendsActive}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--wc-text-2)' }}>
              в сети
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            background: 'var(--wc-surface)',
            border: '1px solid var(--wc-separator)',
            borderRadius: 18,
            padding: '14px 16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 16 }}>🪙</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--wc-text)' }}>
                Монеты друзей
              </div>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--wc-text-3)' }}>
                демо-данные
              </div>
            </div>
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: 'var(--wc-text)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {demoStats.friendsCoins.toLocaleString('ru-RU')}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {demoAvatars.map((e, i) => (
            <div
              key={i}
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                border: '2px solid var(--wc-bg)',
                background: 'var(--wc-surface-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: i === demoAvatars.length - 1 ? 0 : -8,
                fontSize: 15,
              }}
            >
              {e}
            </div>
          ))}
          <div
            style={{
              marginLeft: 10,
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--wc-text-2)',
            }}
          >
            Друзья уже тут!
          </div>
        </div>
      </div>
    </div>
  );
};