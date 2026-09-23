import type { FC } from 'react';

import type { Gender } from '@/hooks/useGender';

interface GenderSelectProps {
  onSelect: (gender: Gender) => void;
}

export const GenderSelect: FC<GenderSelectProps> = ({ onSelect }) => {
  const option = (gender: Gender, emoji: string, label: string) => (
    <button
      onClick={() => onSelect(gender)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '18px 0',
        borderRadius: 'var(--wc-radius-m)',
        border: '1px solid var(--wc-separator)',
        background: 'var(--wc-surface)',
        color: 'var(--wc-text)',
        fontSize: 18,
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: 'var(--wc-shadow-1)',
      }}
    >
      <span style={{ fontSize: 26 }}>{emoji}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        padding: '0 24px',
        background: 'var(--wc-bg)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 52,
            lineHeight: 1,
          }}
        >
          🪙
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: 'var(--wc-text)',
            letterSpacing: -0.5,
          }}
        >
          Добро пожаловать
        </div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 500,
            lineHeight: 1.45,
            color: 'var(--wc-text-2)',
            maxWidth: 280,
          }}
        >
          Кто ты в этой игре?
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          width: '100%',
          maxWidth: 320,
        }}
      >
        {option('male', '👨', 'Мужчина')}
        {option('female', '👩', 'Женщина')}
      </div>

      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--wc-text-3)',
          textAlign: 'center',
          maxWidth: 260,
          lineHeight: 1.4,
        }}
      >
        Выбор сохранится в твоём профиле. Поменять можно будет позже.
      </div>
    </div>
  );
};