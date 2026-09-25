import type { FC } from 'react';

import { GenderBar } from '@/components/GenderBar/GenderBar.tsx';

/**
 * Страница «Статистика»: процентное соотношение мужчин и женщин
 * по всей аудитории. Источник — демо-заглушка (useGenderStats),
 * позже подключится реальный сервер.
 */
export const StatsPage: FC = () => {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 28,
        paddingTop: 32,
        paddingLeft: 24,
        paddingRight: 24,
        position: 'relative',
        zIndex: 1,
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
        <div style={{ fontSize: 40, lineHeight: 1 }}>📊</div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: 'var(--wc-text)',
            letterSpacing: -0.5,
          }}
        >
          Статистика
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--wc-text-2)',
            maxWidth: 280,
            lineHeight: 1.45,
          }}
        >
          Соотношение мужчин и женщин среди всех игроков
        </div>
      </div>

      <GenderBar />
    </div>
  );
};