/**
 * Вкладка «Завод»: список заводов, их производство и сбор улучшений.
 *
 * С первого взгляда должно быть понятно три вещи: что у меня уже
 * работает, что можно купить, и когда можно забрать улучшение. Поэтому
 * список разбит на две секции, лишние подписи сняты (уровень живёт
 * компактным бейджем, склад — точками), а сверху показаны только те
 * статы, которые действительно отличаются от базовых: семь одинаковых
 * чипов читались как шум.
 *
 * Общей зелёной кнопки сбора нет: доход автокликера уходит на баланс
 * сам, а здесь игрок забирает именно улучшения, каждое отдельно.
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

  const notify = (message: string, rare = false) => {
    try {
      if (rare) hapticFeedback.notificationOccurred('success');
      else hapticFeedback.impactOccurred('medium');
    } catch {
      // хептика недоступна вне Telegram — игнорируем
    }
    setToast(message);
  };

  const handleBuy = (def: FactoryDef, cost: number) => {
    if (coins < cost) return;
    if (buy(def.id)) notify(`${def.title} куплен`);
  };

  const handleCollect = (def: FactoryDef) => {
    const result = collect(def.id);
    if (!result || result.count <= 0) return;
    const label = RARE_EFFECT_LABELS[result.kind];
    notify(result.rare ? `РЕДКОЕ ×5 · ${label}` : `+${result.count} · ${label}`, result.rare);
  };

  // Делим на два списка: уже работающие заводы и то, что можно купить.
  // Смешанные в одну кучу карточки заставляют искать свои глазами.
  const working = FACTORIES.filter((def) => progressOf(def.id)?.owned);
  const available = FACTORIES.filter((def) => !progressOf(def.id)?.owned);

  const renderCard = (def: FactoryDef) => {
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
            lineHeight: 1.35,
          }}
        >
          Заводы сами готовят улучшения. Забирай — и бонус остаётся навсегда.
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
        {working.length > 0 && <SectionTitle>Работают</SectionTitle>}
        {working.map(renderCard)}

        {available.length > 0 && <SectionTitle>Купить</SectionTitle>}
        {available.map(renderCard)}
      </div>
    </div>
  );
};

const SectionTitle: FC<{ children: ReactNode }> = ({ children }) => (
  <div
    style={{
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: 'var(--wc-text-3)',
      marginTop: 4,
    }}
  >
    {children}
  </div>
);

/**
 * Сводка по главным статам.
 *
 * Показываем только то, чем стат отличается от базового: по умолчанию
 * игрок видит три понятные цифры, а не семь подписей с множителями
 * «×1.00», которые к тому моменту ничего не значат.
 */
const StatRow: FC<{ bonuses: FactoryBonuses; ratePerHour: number }> = ({
  bonuses,
  ratePerHour,
}) => {
  const items: string[] = [];
  if (bonuses.tapBonusMicro > 0) items.push(`Клик +${formatTokens(bonuses.tapBonusMicro)}`);
  if (bonuses.critChanceBps > 0) items.push(`Крит ${(bonuses.critChanceBps / 100).toFixed(1)}%`);
  items.push(`${formatTokens(ratePerHour)}/час`);
  if (bonuses.autoclickClicks > 1) items.push(`Авто ×${bonuses.autoclickClicks}`);
  if (bonuses.effMult > 1) items.push(`Улучшения ×${bonuses.effMult.toFixed(2)}`);
  if (bonuses.qualityMult > 1) items.push(`Качество ×${bonuses.qualityMult.toFixed(2)}`);
  if (bonuses.cooldownMs > 0) items.push(`КД −${Math.round(bonuses.cooldownMs / 1000)} сек`);
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
  const { owned, level, cost, stock, waitMs, full, cycleMs } = progress;
  const secondsLeft = Math.ceil(waitMs / 1000);
  const progressPercent =
    owned && !full && cycleMs > 0 ? Math.min(100, ((cycleMs - waitMs) / cycleMs) * 100) : 0;
  const affordable = coins >= cost;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
        padding: 11,
        background: 'var(--wc-surface)',
        // Когда на складе лежит улучшение, рамка подсвечивается: глаз
        // сразу находит карточки, по которым есть что забирать.
        border:
          stock > 0
            ? '1px solid rgba(46, 230, 107, 0.55)'
            : '1px solid var(--wc-separator)',
        boxShadow: stock > 0 ? '0 0 16px rgba(46, 230, 107, 0.22)' : 'var(--wc-shadow-1)',
        borderRadius: 'var(--wc-radius-m)',
        flexShrink: 0,
        // Некупленный завод приглушён: в списке из десяти сразу видно,
        // что реально работает, а что ещё не куплено.
        opacity: owned ? 1 : 0.72,
      }}
    >
      {/* Шапка: картинка, название, эффект и цена */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <img
          src={def.image}
          alt=""
          style={{
            width: 52,
            height: 52,
            borderRadius: 'var(--wc-radius-s)',
            display: 'block',
            pointerEvents: 'none',
            userSelect: 'none',
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--wc-text)',
                lineHeight: 1.2,
              }}
            >
              {def.title}
            </span>
            {owned && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: 'var(--wc-accent)',
                  background: 'rgba(255, 184, 0, 0.14)',
                  border: '1px solid rgba(255, 184, 0, 0.3)',
                  borderRadius: 100,
                  padding: '2px 6px',
                  flexShrink: 0,
                }}
              >
                ур. {level}
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--wc-accent)',
              marginTop: 4,
              lineHeight: 1.3,
            }}
          >
            {def.effectText}
          </div>
        </div>
      </div>

      {/* У купленных заводов: склад точками и полоса готовности */}
      {owned && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', gap: 4, flex: 1 }}>
              {Array.from({ length: MAX_STOCK }, (_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 7,
                    borderRadius: 100,
                    background:
                      i < stock
                        ? 'linear-gradient(90deg, #2ee66b, #12b355)'
                        : 'var(--wc-surface-2)',
                  }}
                />
              ))}
            </div>
            {full && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#7dffb0',
                  flexShrink: 0,
                }}
              >
                склад полон
              </span>
            )}
          </div>

          {stock < MAX_STOCK && (
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
        </div>
      )}

      {/* Действия: сбор/ожидание и покупка/улучшение */}
      <div
        style={{
          display: 'flex',
          flexDirection: owned ? 'row' : 'column',
          gap: 8,
        }}
      >
        {owned && stock > 0 && (
          <ActionButton onClick={onCollect} variant="collect">
            Забрать +{stock}
          </ActionButton>
        )}
        {owned && stock === 0 && (
          <ActionButton onClick={undefined} variant="wait">
            Ещё {secondsLeft} сек
          </ActionButton>
        )}
        <ActionButton
          onClick={onBuy}
          variant={owned ? 'upgrade' : 'buy'}
          disabled={!affordable}
          affordable={affordable}
        >
          {affordable
            ? `${owned ? 'Улучшить' : 'Купить'} · ${formatTokens(cost)}`
            : 'Не хватает денег'}
        </ActionButton>
      </div>
    </div>
  );
};

interface ButtonLook {
  background: string;
  color: string;
  boxShadow: string;
  border: string;
}

/** Серый: ничего не просит внимания и не выглядит доступным. */
const IDLE: ButtonLook = {
  background: 'var(--wc-surface-2)',
  color: 'var(--wc-text-3)',
  boxShadow: 'none',
  border: '1px solid var(--wc-separator)',
};

/** Оранжево-жёлтая сияющая — когда покупка или улучшение доступны. */
const GLOW: ButtonLook = {
  background: 'linear-gradient(135deg, #ffe07a 0%, #ffb800 45%, #ff8a00 100%)',
  color: '#1a1200',
  boxShadow: '0 8px 22px rgba(255, 184, 0, 0.5), 0 0 0 1px rgba(255, 224, 122, 0.45)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
};

interface ActionButtonProps {
  onClick?: () => void;
  variant: 'collect' | 'buy' | 'upgrade' | 'wait';
  disabled?: boolean;
  /** Хватает ли денег: меняет ценовую кнопку с оранжевой на серую. */
  affordable?: boolean;
  children: ReactNode;
}

const ActionButton: FC<ActionButtonProps> = ({
  onClick,
  variant,
  disabled,
  affordable = true,
  children,
}) => {
  // Цена и улучшение живут по одному правилу: серы, пока денег не
  // хватает, и загораются оранжево-жёлтым, как только хватает.
  const isPrice = variant === 'buy' || variant === 'upgrade';
  const styles: Record<ActionButtonProps['variant'], ButtonLook> = {
    collect: {
      background: 'linear-gradient(135deg, #2ee66b 0%, #12b355 100%)',
      color: '#04180c',
      boxShadow: '0 8px 20px rgba(46, 230, 107, 0.4)',
      border: '1px solid rgba(255, 255, 255, 0.16)',
    },
    buy: affordable ? GLOW : IDLE,
    upgrade: affordable ? GLOW : IDLE,
    wait: IDLE,
  };

  const look = styles[variant];
  // Серую ценовую кнопку не притемняем: она и так выключена, а
  // потеря контраста сделала бы надпись «Не хватает денег» нечитаемой.
  const opacity = isPrice && !affordable ? 1 : disabled ? 0.55 : 1;

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
        opacity,
        WebkitTapHighlightColor: 'transparent',
        textAlign: 'center',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
};