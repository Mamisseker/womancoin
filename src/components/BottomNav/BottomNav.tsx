import { classNames } from '@/css/classnames.js';

import type { FC, ReactNode } from 'react';

interface Tab {
  id: string;
  label: string;
  icon: ReactNode;
}

const tabs: Tab[] = [
  {
    id: 'tap',
    label: 'Тап',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3.5" />
      </svg>
    ),
  },
  {
    id: 'stats',
    label: 'Статистика',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10" />
        <path d="M12 20V4" />
        <path d="M6 20v-6" />
      </svg>
    ),
  },
  {
    id: 'boost',
    label: 'Завод',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 20h20" />
        <path d="M4 20V8l6 4V8l6 4V6h4v14" />
        <path d="M15 6V4h4v2" />
      </svg>
    ),
  },
  {
    id: 'friends',
    label: 'Друзья',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="4" />
        <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      </svg>
    ),
  },
  {
    id: 'wallet',
    label: 'Кошелёк',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
        <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
      </svg>
    ),
  },
];

interface BottomNavProps {
  active: string;
  onChange: (tab: string) => void;
}

export const BottomNav: FC<BottomNavProps> = ({ active, onChange }) => {
  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
        padding: '0 16px calc(16px + env(safe-area-inset-bottom))',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          justifyContent: 'space-around',
          gap: 4,
          background: 'var(--wc-glass-bg)',
          border: '3px solid rgba(22,41,74,0.85)',
          borderRadius: 12,
          padding: 8,
          boxShadow: '0 5px 0 rgba(22,41,74,0.2), var(--wc-shadow-2)',
        }}
      >
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={classNames(
                'bottom-nav__tab',
                isActive && 'bottom-nav__tab--active',
              )}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                flex: 1,
                border: isActive ? '2px solid rgba(22,41,74,0.75)' : '2px solid transparent',
                borderRadius: 8,
                padding: '7px 4px',
                cursor: 'pointer',
                background: isActive ? 'var(--wc-accent-soft)' : 'transparent',
                color: isActive ? 'var(--wc-accent)' : 'var(--wc-nav-inactive)',
                transition: 'color 0.15s ease, background 0.15s ease',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span style={{ width: 24, height: 24, display: 'block' }}>{tab.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.2 }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};