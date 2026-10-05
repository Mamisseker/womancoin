import type { FC } from 'react';

import { GenderBar } from '@/components/GenderBar/GenderBar.tsx';

/**
 * Страница «Статистика»: соотношение мужчин и женщин по аудитории
 * (демо-источник, позже реальный сервер).
 *
 * Прокачки отсюда убраны до лучших времён: компонент UpgradesSection
 * остался в проекте, вернуть его — одна строка.
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

      <div style={{ alignSelf: 'stretch' }}>
        <GenderBar />
      </div>
    </div>
  );
};