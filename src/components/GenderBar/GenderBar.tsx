import type { FC } from 'react';

import { useGenderStats, whoLeads } from '@/hooks/useGenderStats';

/**
 * Бар «мужчины vs женщины»: процентное соотношение и кто впереди.
 * Пока данные — демо-заглушка, источник заменится сервером.
 */
export const GenderBar: FC = () => {
  const stats = useGenderStats();
  const total = stats.male + stats.female || 1;
  const malePct = Math.round((stats.male / total) * 100);
  const femalePct = 100 - malePct;
  const leads = whoLeads(stats);
  const leadLabel = leads === 'male' ? 'Мужчины впереди' : 'Женщины впереди';

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--wc-text-2)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>👨</span> {malePct}%
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {femalePct}% <span>👩</span>
        </span>
      </div>

      <div
        style={{
          height: 10,
          borderRadius: 100,
          overflow: 'hidden',
          display: 'flex',
          background: 'var(--wc-surface-2)',
        }}
      >
        <div
          style={{
            width: `${malePct}%`,
            background: '#4f8ef7',
            transition: 'width 0.5s ease',
          }}
        />
        <div
          style={{
            width: `${femalePct}%`,
            background: '#ff5fa2',
            transition: 'width 0.5s ease',
          }}
        />
      </div>

      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--wc-text)',
          textAlign: 'center',
        }}
      >
        {leadLabel}
      </div>
    </div>
  );
};