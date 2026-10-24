import { hapticFeedback, openLink, shareURL } from '@tma.js/sdk-react';
import { motion } from 'framer-motion';
import type { FC } from 'react';
import { useEffect, useState } from 'react';

import { FRIEND_REWARD, FRIENDS_FACTORY } from '@/lib/factories.ts';
import { formatTokens } from '@/lib/units.ts';

/** Ссылка без Telegram-пользователя (десктоп/браузер) — просто на бота. */
const FALLBACK_LINK = 'https://t.me/Wo_Mancoin_bot';

const SHARE_TEXT = 'Заходи в Womancoin — качаем заводы вместе. Забирай бонус:';

/**
 * Копирование с запасным путём: Clipboard API нет в старых WebView
 * и в приватном режиме, там остаётся скрытая textarea.
 */
const copyText = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Ниже пробуем старый способ.
  }

  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
};

interface FriendsSheetProps {
  friends: number;
  /** Реферальная ссылка игрока; пустая — показываем ссылку на бота. */
  referralLink: string;
  onClose: () => void;
}

/**
 * Шторка дружеского завода: ссылка для приглашения и системный выбор
 * чатов Telegram. Открывается тапом по карточке «Дружеский».
 */
export const FriendsSheet: FC<FriendsSheetProps> = ({ friends, referralLink, onClose }) => {
  const link = referralLink || FALLBACK_LINK;
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (!hint) return;
    const id = window.setTimeout(() => setHint(null), 2000);
    return () => window.clearTimeout(id);
  }, [hint]);

  const handleCopy = () => {
    void copyText(link).then((ok) => {
      if (ok) {
        hapticFeedback.notificationOccurred('success');
        setHint('Ссылка скопирована');
      } else {
        hapticFeedback.notificationOccurred('error');
        setHint('Не удалось скопировать — выдели ссылку вручную');
      }
    });
  };

  const handleInvite = () => {
    hapticFeedback.impactOccurred('light');
    try {
      // Нативный выбор чатов и контактов Telegram.
      shareURL(link, SHARE_TEXT);
    } catch {
      // Старая версия клиента — та же share-ссылка через openLink.
      try {
        openLink(
          `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(SHARE_TEXT)}`,
        );
      } catch {
        setHint('Приглашение доступно только в Telegram');
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Пригласить друзей"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(2px)',
        }}
      />

      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        onClick={(event) => event.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 420,
          background: 'var(--wc-surface)',
          borderRadius: 20,
          border: '1px solid var(--wc-separator)',
          boxShadow: 'var(--wc-shadow-2)',
          padding: '10px 16px calc(16px + env(safe-area-inset-bottom))',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div
          aria-hidden
          style={{
            alignSelf: 'center',
            width: 38,
            height: 4,
            borderRadius: 100,
            background: 'var(--wc-separator)',
            marginBottom: 2,
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src={FRIENDS_FACTORY.image}
            alt=""
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--wc-radius-s)',
              display: 'block',
              pointerEvents: 'none',
              userSelect: 'none',
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--wc-text)' }}>
              Пригласить друзей
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--wc-text-2)',
                marginTop: 2,
                lineHeight: 1.35,
              }}
            >
              Каждый друг — уровень завода и {formatTokens(FRIEND_REWARD)} разово.
              {friends > 0 ? ` Уже друзей: ${friends}.` : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            style={{
              width: 32,
              height: 32,
              flexShrink: 0,
              borderRadius: 100,
              background: 'var(--wc-surface-2)',
              border: '1px solid var(--wc-separator)',
              color: 'var(--wc-text-2)',
              fontSize: 16,
              fontWeight: 800,
              lineHeight: 1,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: 'var(--wc-text-3)',
            }}
          >
            Твоя ссылка
          </span>
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--wc-radius-s)',
              background: 'var(--wc-surface-2)',
              border: '1px solid var(--wc-separator)',
              color: 'var(--wc-text-2)',
              fontSize: 12,
              fontWeight: 600,
              lineHeight: 1.4,
              wordBreak: 'break-all',
              userSelect: 'all',
            }}
          >
            {link}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={handleCopy}
            style={{
              flex: '1 1 0%',
              minWidth: 0,
              padding: '11px 10px',
              borderRadius: 'var(--wc-radius-s)',
              background: 'var(--wc-surface-2)',
              border: '1px solid var(--wc-separator)',
              color: 'var(--wc-text)',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Скопировать
          </button>
          <button
            type="button"
            onClick={handleInvite}
            style={{
              flex: '1.3 1 0%',
              minWidth: 0,
              padding: '11px 10px',
              borderRadius: 'var(--wc-radius-s)',
              background:
                'linear-gradient(135deg, #ffe07a 0%, #ffb800 45%, #ff8a00 100%)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 22px rgba(255, 184, 0, 0.45)',
              color: '#1a1200',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 900,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Пригласить
          </button>
        </div>

        <div
          style={{
            minHeight: 16,
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--wc-text-3)',
            textAlign: 'center',
          }}
        >
          {hint ?? 'Откроется выбор контактов и чатов Telegram'}
        </div>
      </motion.div>
    </div>
  );
};
