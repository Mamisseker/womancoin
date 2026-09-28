import type { FC } from 'react';

import factoryImg from '@/components/FactoryPage/factory.png';

interface FactoryPageProps {
  title?: string;
  text?: string;
}

export const FactoryPage: FC<FactoryPageProps> = ({
  title = 'Завод',
  text = 'Здесь скоро появятся усилители производства: смены, автоматизация и спецоборудование.',
}) => {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        textAlign: 'center',
        gap: 16,
      }}
    >
      <img
        src={factoryImg}
        alt="Завод"
        style={{
          width: 200,
          height: 200,
          borderRadius: '50%',
          objectFit: 'cover',
          boxShadow: 'var(--wc-shadow-1)',
          border: '3px solid var(--wc-surface-2)',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--wc-text)' }}>
        {title}
      </div>
      <div style={{ fontSize: 15, color: 'var(--wc-text-2)', maxWidth: 300, lineHeight: 1.5 }}>
        {text}
      </div>
    </div>
  );
};