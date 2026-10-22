import type { FC } from 'react';

import { GenderBar } from '@/components/GenderBar/GenderBar.tsx';

/**
 * «Статистика»: соотношение мужчин и женщин по аудитории
 * (демо-источник, позже реальный сервер).
 *
 * Отдельной вкладкой больше не живёт — вкладка «Статистика» убрана,
 * экран открывается кнопкой из левого верхнего угла «Тапа». Поэтому
 * это оверлей поверх всего приложения, как панель разработчика.
 *
 * Прокачки отсюда убраны до лучших времён: компонент UpgradesSection
 * остался в проекте, вернуть его — одна строка.
 */
export const StatsPage: FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'var(--wc-bg)',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        padding: '16px 16px 48px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 28,
      }}
    >
      <div
        style={{
          alignSelf: 'stretch',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--wc-text)' }}>Статистика</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--wc-text-3)', marginTop: 2 }}>
            Соотношение мужчин и женщин среди всех игроков
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: '7px 12px',
            borderRadius: 'var(--wc-radius-s)',
            background: 'var(--wc-surface-2)',
            border: '1px solid var(--wc-separator)',
            color: 'var(--wc-text-2)',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Закрыть
        </button>
      </div>

      <div style={{ alignSelf: 'stretch' }}>
        <GenderBar />
      </div>
    </div>
  );
};