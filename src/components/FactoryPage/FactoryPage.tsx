/**
 * Вкладка «Завод»: список заводов, их производство и сбор улучшений.
 *
 * Вертикальный список, который прокручивается вниз: заводов станет
 * больше, и новые должны добавляться сверху, не ломая привычную
 * картинку. Каждая карточка живёт сама по себе — покупается, крутит
 * свой КД, показывает склад и даёт кнопку «Забрать».
 *
 * Общей зелёной кнопки сбора больше нет: доход автокликера уходит на
 * баланс сам, а здесь игрок забирает именно улучшения, каждое отдельно.
 */

import { hapticFeedback } from '@tma.js/sdk-react';
import type { FC, ReactNode } from 'react';
import { useEffect, useState } from 'react';

import {
  FACTORIES,
  MAX_STOCK,
  RARE_EFFECT_LABELS,
  type CollectResult,
  type FactoryBonuses,
  type FactoryDef,
  type FactoryId,
  type FactoryProgress,
} from '@/lib/factories.ts';
import { formatTokens } from '@/lib/units.ts';

interface FactoryPageProps {
  coins: number;
  bonuses: FactoryBonuses;
  ratePerHour: number;
  buy: (id: FactoryId) => boolean;
  collect: (id: FactoryId) => CollectResult | null;
  progressOf: (id: FactoryId) => FactoryProgress | null;
}

export const FactoryPage: FC<FactoryPageProps> = ({
  coins,
  bonuses,
  ratePerHour,
  buy,
  collect,
  progressOf,
}) => {
  const [toast, setToast] = useState<string | null>(null);

  // Сообщение о собранном улучшении гаснет само, чтобы не засорять список.
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(id);
  }, [toast]);

  const notify = (message: string) => {
    try {
      hapticFeedback.impactOccurred('medium');
    } catch {
      // хептика недоступна вне Telegram — игнорируем
    }
    setToast(message);
  };

  const handleBuy = (def: FactoryDef, cost: number) => {
    if (coins < cost) return;
    try {
      hapticFeedback.impactOccurred('medium');
    } catch {
      // хептика недоступна вне Telegram — игнорируем
    }
    if (buy(def.id)) notify(`${def.title} куплен`);
  };

  const handleCollect = (def: FactoryDef) => {
    const result = collect(def.id);
    if (!result || result.count <= 0) return;
    const label = RARE_EFFECT_LABELS[result.kind];
    notify(result.rare ? `РЕДКОЕ ×5 · ${label}` : `+${result.count} · ${label}`);
    try {
      if (result.rare) hapticFeedback.notificationOccurred('success');
      else hapticFeedback.impactOccurred('light');
    } catch {
      // хептика недоступна вне Telegram — игнорируем
    }
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        paddingTop: 16,
        minHeight: 0,
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div style={{ paddingLeft: 20, paddingRight: 20, flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--wc-text)' }}>
          Мои заводы
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--wc-text-2)',
            marginTop: 3,
          }}
        >
          Каждый раз в КД кладёт улучшение на склад. Забирай — усиливает навсегда.
        </div>

        <StatRow bonuses={bonuses} ratePerHour={ratePerHour} />
      </div>

      {toast && (
        <div
          style={{
            margin: '0 20px',
            padding: '9px 12px',
            borderRadius: 'var(--wc-radius-m)',
            background: 'rgba(46, 230, 107, 0.16)',
            border: '1px solid rgba(46, 230, 107, 0.4)',
            color: '#7dffb0',
            fontSize: 13,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {toast}
        </div>
      )}

      {/* Прокручиваемый вниз список заводов */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          paddingLeft: 20,
          paddingRight: 20,
          paddingBottom: 16,
        }}
      >
        {FACTORIES.map((def) => {
          const progress = progressOf(def.id);
          if (!progress) return null;
          return (
            <FactoryCard
              key={def.id}
              def={def}
              progress={progress}
              coins={coins}
              onBuy={() => handleBuy(def, progress.cost)}
              onCollect={() => handleCollect(def)}
            />
          );
        })}
      </div>
    </div>
  );
};

/** Сводка по главным статам — чтобы стратегию было видно одним взглядом. */
const StatRow: FC<{ bonuses: FactoryBonuses; ratePerHour: number }> = ({
  bonuses,
  ratePerHour,
}) => {
  const items = [
    `Клик +${formatTokens(bonuses.tapBonusMicro)}`,
    `Крит ${(bonuses.critChanceBps / 100).toFixed(1)}%`,
    `Авто ×${bonuses.autoclickClicks}`,
    `${formatTokens(ratePerHour)}/час`,
    `Улучшения ×${bonuses.effMult.toFixed(2)}`,
    `Качество ×${bonuses.qualityMult.toFixed(2)}`,
    `КД −${(bonuses.cooldownMs / 1000).toFixed(1)} сек`,
  ];
  if (bonuses.spaceMult > 1) items.push('🚀 ×2 к кликам');

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
      {items.map((text) => (
        <span
          key={text}
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--wc-text-2)',
            background: 'var(--wc-surface-2)',
            border: '1px solid var(--wc-separator)',
            borderRadius: 100,
            padding: '5px 9px',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {text}
        </span>
      ))}
    </div>
  );
};

interface FactoryCardProps {
  def: FactoryDef;
  progress: FactoryProgress;
  coins: number;
  onBuy: () => void;
  onCollect: () => void;
}

const FactoryCard: FC<FactoryCardProps> = ({
  def,
  progress,
  coins,
  onBuy,
  onCollect,
}) => {
  const { owned, level, cost, stock, waitMs, ready, full, cycleMs } = progress;
  const secondsLeft = Math.ceil(waitMs / 1000);
  // Прогресс полосы: сколько уже прошло от цикла производства.
  const progressPercent =
    owned && !full && cycleMs > 0 ? Math.min(100, ((cycleMs - waitMs) / cycleMs) * 100) : 0;
  const affordable = coins >= cost;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 10,
        background: 'var(--wc-surface)',
        border: '1px solid var(--wc-separator)',
        borderRadius: 'var(--wc-radius-m)',
        boxShadow: 'var(--wc-shadow-1)',
        flexShrink: 0,
        // Некупленный завод приглушён, чтобы в списке из десяти сразу
        // читалось, что реально работает, а что ещё не куплено.
        opacity: owned ? 1 : 0.68,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img
          src={def.image}
          alt={def.title}
          style={{
            width: 54,
            height: 54,
            borderRadius: 'var(--wc-radius-s)',
            display: 'block',
            pointerEvents: 'none',
            userSelect: 'none',
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--wc-text)',
              lineHeight: 1.2,
            }}
          >
            {def.title}
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--wc-accent)',
              marginTop: 3,
              lineHeight: 1.25,
            }}
          >
            {def.effectText}
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--wc-text-3)',
              marginTop: 3,
            }}
          >
            {owned ? `Уровень ${level} · собрано ${stock} из ${MAX_STOCK}` : 'Не куплен'}
          </div>
        </div>
      </div>

      {/* Склад: сколько улучшений ждёт забора */}
      {owned && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', gap: 4, flex: 1 }}>
            {Array.from({ length: MAX_STOCK }, (_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 100,
                  background:
                    i < stock ? 'linear-gradient(90deg, #2ee66b, #12b355)' : 'var(--wc-surface-2)',
                }}
              />
            ))}
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: full ? '#7dffb0' : 'var(--wc-text-3)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {full ? 'склад полон' : `${Math.ceil(cycleMs / 1000)} сек / шт`}
          </span>
        </div>
      )}

      {/* Полоса готовности следующего улучшения */}
      {owned && !full && (
        <div
          style={{
            height: 4,
            borderRadius: 100,
            background: 'var(--wc-surface-2)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progressPercent}%`,
              height: '100%',
              borderRadius: 100,
              background: 'linear-gradient(90deg, var(--wc-accent), var(--wc-accent-2))',
              transition: 'width 0.5s linear',
            }}
          />
        </div>
      )}

      {/* Действия: покупка / улучшение / сбор */}
      <div style={{ display: 'flex', gap: 8 }}>
        {ready && (
          <ActionButton onClick={onCollect} variant="collect">
            Забрать улучшение
          </ActionButton>
        )}
        {!ready && owned && !full && (
          <ActionButton onClick={undefined} variant="wait">
            Готовится · {secondsLeft} сек
          </ActionButton>
        )}
        {!ready && owned && full && (
          <ActionButton onClick={onCollect} variant="collect">
            Склад полон · забрать {stock}
          </ActionButton>
        )}
        <ActionButton
          onClick={onBuy}
          variant={owned ? 'upgrade' : 'buy'}
          disabled={!affordable}
        >
          {owned ? `Улучшить · ${formatTokens(cost)}` : `Купить · ${formatTokens(cost)}`}
        </ActionButton>
      </div>
    </div>
  );
};

interface ActionButtonProps {
  onClick?: () => void;
  variant: 'collect' | 'buy' | 'upgrade' | 'wait';
  disabled?: boolean;
  children: ReactNode;
}

const ActionButton: FC<ActionButtonProps> = ({ onClick, variant, disabled, children }) => {
  const styles: Record<
    ActionButtonProps['variant'],
    { background: string; color: string; boxShadow: string; border: string }
  > = {
    collect: {
      background: 'linear-gradient(135deg, #2ee66b 0%, #12b355 100%)',
      color: '#04180c',
      boxShadow: '0 8px 20px rgba(46, 230, 107, 0.4)',
      border: '1px solid rgba(255, 255, 255, 0.16)',
    },
    buy: {
      background: 'linear-gradient(135deg, var(--wc-accent), var(--wc-accent-2))',
      color: '#1a1200',
      boxShadow: '0 8px 20px rgba(255, 184, 0, 0.28)',
      border: '1px solid rgba(255, 255, 255, 0.14)',
    },
    upgrade: {
      background: 'var(--wc-surface-2)',
      color: 'var(--wc-accent)',
      boxShadow: 'none',
      border: '1px solid var(--wc-separator)',
    },
    wait: {
      background: 'var(--wc-surface-2)',
      color: 'var(--wc-text-3)',
      boxShadow: 'none',
      border: '1px solid var(--wc-separator)',
    },
  };

  const look = styles[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      style={{
        flex: 1,
        padding: '9px 10px',
        borderRadius: 'var(--wc-radius-s)',
        border: look.border,
        background: look.background,
        color: look.color,
        boxShadow: look.boxShadow,
        fontFamily: 'inherit',
        fontSize: 12,
        fontWeight: 800,
        lineHeight: 1.2,
        cursor: disabled || !onClick ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        WebkitTapHighlightColor: 'transparent',
        textAlign: 'center',
      }}
    >
      {children}
    </button>
  );
};
