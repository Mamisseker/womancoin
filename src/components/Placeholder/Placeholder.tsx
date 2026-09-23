import type { FC } from 'react';

interface PlaceholderProps {
  icon?: string;
  title: string;
  text: string;
}

export const Placeholder: FC<PlaceholderProps> = ({ icon, title, text }) => {
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
      {icon && (
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'var(--wc-surface-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 34,
          }}
        >
          {icon}
        </div>
      )}
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--wc-text)' }}>
        {title}
      </div>
      <div style={{ fontSize: 15, color: 'var(--wc-text-2)', maxWidth: 300, lineHeight: 1.5 }}>
        {text}
      </div>
    </div>
  );
};