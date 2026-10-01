import { hapticFeedback } from '@tma.js/sdk-react';
import { useMemo, useState, type FC } from 'react';

import factoryImg from '@/components/FactoryPage/factory.png';
import {
  FACTORY_UPGRADES,
  TIER_LABELS,
  type FactoryUpgradeDef,
} from '@/components/FactoryPage/factoryUpgrades.ts';

type SortKey = 'cost' | 'level';

const SORT_LABELS: Record<SortKey, string> = {
  cost: 'по цене',
  level: 'по уровню',
};

interface FactoryPageProps {
  /** Уровень тапа игрока — от него зависит, какие карточки открыты. */
  tapLevel: number;
}

export const FactoryPage: FC<FactoryPageProps> = ({ tapLevel }) => {
  const [sortKey, setSortKey] = useState<SortKey>('cost');

  // Копия массива перед сортировкой: мутировать исходный нельзя,
  // иначе следующий переключатель отсортирует уже разобранный список.
  const upgrades = useMemo(() => {
    const list = [...FACTORY_UPGRADES];
    list.sort((a, b) =>
      sortKey === 'cost'
        ? a.baseCost - b.baseCost
        : a.requiredTapLevel - b.requiredTapLevel,
    );
    return list;
  }, [sortKey]);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        paddingLeft: 20,
        paddingRight: 20,
        paddingBottom: 24,
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <img
          src={factoryImg}
          alt="Завод"
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            objectFit: 'cover',
            border: '1px solid var(--wc-separator)',
            boxShadow: 'var(--wc-shadow-1)',
            flexShrink: 0,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--wc-text)' }}>
            Завод
          </div>
          <div style={{ fontSize: 13, color: 'var(--wc-text-2)' }}>
            Усилители производства
          </div>
        </div>
      </div>

      {/* Переключатель сортировки */}
      <div style={{ display: 'flex', gap: 8 }}>
        {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => {
          const active = key === sortKey;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                try {
                  hapticFeedback.selectionChanged();
                } catch {
                  // хептика недоступна вне Telegram — игнорируем
                }
                setSortKey(key);
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: 13,
                fontWeight: 700,
                fontFamily: 'inherit',
                cursor: 'pointer',
                borderRadius: 'var(--wc-radius-s)',
                border: '1px solid var(--wc-separator)',
                background: active ? 'var(--wc-accent)' : 'var(--wc-surface)',
                color: active ? 'var(--wc-accent-text)' : 'var(--wc-text-2)',
                boxShadow: 'var(--wc-shadow-1)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {SORT_LABELS[key]}
            </button>
          );
        })}
      </div>

      {upgrades.map((def) => (
        <FactoryCard key={def.id} def={def} tapLevel={tapLevel} />
      ))}
    </div>
  );
};

interface FactoryCardProps {
  def: FactoryUpgradeDef;
  tapLevel: number;
}

const FactoryCard: FC<FactoryCardProps> = ({ def, tapLevel }) => {
  const locked = tapLevel < def.requiredTapLevel;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'var(--wc-surface)',
        border: '1px solid var(--wc-separator)',
        borderRadius: 'var(--wc-radius-m)',
        padding: '12px 14px',
        boxShadow: 'var(--wc-shadow-1)',
        // Закрытые карточки приглушены, но текст остаётся читаемым.
        opacity: locked ? 0.55 : 1,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          background: 'var(--wc-surface-2)',
          filter: locked ? 'grayscale(1)' : 'none',
        }}
      >
        {def.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--wc-text)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {def.title}
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              color: 'var(--wc-accent)',
              background: 'var(--wc-accent-soft)',
              borderRadius: 6,
              padding: '2px 6px',
            }}
          >
            {TIER_LABELS[def.tier]}
          </span>
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--wc-text-2)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {def.detail}
        </div>
      </div>

      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        {locked ? (
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--wc-text-3)' }}>
            уро. {def.requiredTapLevel}
          </div>
        ) : (
          <>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: 'var(--wc-accent)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {def.baseCost.toLocaleString('ru-RU')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--wc-text-3)' }}>монет</div>
          </>
        )}
      </div>
    </div>
  );
};