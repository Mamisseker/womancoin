/**
 * Вкладка «Завод»: список своих заводов и сбор накопленного дохода.
 *
 * Заводы — постоянные усиления, а не источник продукции: их бонусы
 * уже учтены в доходе за клик, в скорости автокликера и в шансе крита,
 * и вкладка просто показывает, что именно каждый из них добавляет.
 *
 * Список вертикальный и прокручивается вниз — заводов станет больше,
 * и они должны добавляться сверху, не ломая уже привычную картинку.
 * Зелёная кнопка сбора закреплена снизу и не уезжает при прокрутке.
 */

import { hapticFeedback } from '@tma.js/sdk-react';
import { motion } from 'framer-motion';
import type { FC } from 'react';

import { FACTORIES, getAutoclickIntervalMs, type FactoryDef } from '@/lib/factories.ts';
import { formatTokens } from '@/lib/units.ts';

interface FactoryPageProps {
  /** Накопленный доход автокликера, микро-единицы. */
  pending: number;
  onCollect: () => void;
  /** Ещё идёт первая загрузка сохранения — кнопку держим неактивной. */
  loading?: boolean;
  /** Доход за клик, уже с учётом заводов, микро-единицы. */
  coinsPerTap: number;
  /** Доход автокликера за час, микро-единицы. */
  ratePerHour: number;
}

export const FactoryPage: FC<FactoryPageProps> = ({
  pending,
  onCollect,
  loading,
  coinsPerTap,
  ratePerHour,
}) => {
  const hasLoot = pending > 0;

  const handleCollect = () => {
    if (!hasLoot || loading) return;
    try {
      hapticFeedback.impactOccurred('medium');
    } catch {
      // хептика недоступна вне Telegram — игнорируем
    }
    onCollect();
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
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
          Работают всегда. Доход идёт в счёт и ждёт сбора.
        </div>
      </div>

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
          paddingBottom: 8,
        }}
      >
        {FACTORIES.map((def) => (
          <FactoryCard key={def.id} def={def} />
        ))}
      </div>

      {/* Приёмник дохода — закреплён снизу, шириной во всю ленту карточек */}
      <div style={{ paddingLeft: 20, paddingRight: 20, paddingBottom: 8, flexShrink: 0 }}>
        <CollectButton
          pending={pending}
          active={hasLoot}
          disabled={loading}
          ratePerHour={ratePerHour}
          coinsPerTap={coinsPerTap}
          onClick={handleCollect}
        />
      </div>
    </div>
  );
};

interface FactoryCardProps {
  def: FactoryDef;
}

const FactoryCard: FC<FactoryCardProps> = ({ def }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 10,
        background: 'var(--wc-surface)',
        border: '1px solid var(--wc-separator)',
        borderRadius: 'var(--wc-radius-m)',
        boxShadow: 'var(--wc-shadow-1)',
        flexShrink: 0,
      }}
    >
      <img
        src={def.image}
        alt={def.title}
        style={{
          width: 62,
          height: 62,
          borderRadius: 'var(--wc-radius-s)',
          display: 'block',
          pointerEvents: 'none',
          userSelect: 'none',
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
          {def.effect}
        </div>
      </div>
      <span
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: 'var(--wc-text-3)',
          background: 'var(--wc-surface-2)',
          borderRadius: 100,
          padding: '5px 8px',
          flexShrink: 0,
        }}
      >
        Работает
      </span>
    </div>
  );
};

interface CollectButtonProps {
  pending: number;
  active: boolean;
  disabled?: boolean;
  ratePerHour: number;
  coinsPerTap: number;
  onClick: () => void;
}

/**
 * Зелёная кнопка сбора накопленного.
 *
 * Ширина совпадает с шириной карточек завода. Когда есть что забирать,
 * кнопка горит ярко-зелёным и слегка пульсирует, а на ней написано,
 * сколько именно накопилось; одно нажатие переводит всё на счёт.
 */
const CollectButton: FC<CollectButtonProps> = ({
  pending,
  active,
  disabled,
  ratePerHour,
  coinsPerTap,
  onClick,
}) => {
  const perClick = autoclickLabel(coinsPerTap);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!active || disabled}
      animate={active ? { scale: [1, 1.02, 1] } : { scale: 1 }}
      transition={
        active
          ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 0.2 }
      }
      whileTap={active ? { scale: 0.97 } : undefined}
      style={{
        width: '100%',
        padding: '12px 14px',
        borderRadius: 'var(--wc-radius-m)',
        border: '1px solid rgba(255, 255, 255, 0.16)',
        fontFamily: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 2,
        cursor: active && !disabled ? 'pointer' : 'not-allowed',
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        background: active
          ? 'linear-gradient(135deg, #2ee66b 0%, #12b355 100%)'
          : 'linear-gradient(135deg, rgba(46, 230, 107, 0.16) 0%, rgba(18, 179, 85, 0.12) 100%)',
        boxShadow: active
          ? '0 10px 28px rgba(46, 230, 107, 0.45), 0 0 0 1px rgba(46, 230, 107, 0.35)'
          : 'var(--wc-shadow-1)',
        color: active ? '#04180c' : 'var(--wc-text-3)',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.2 }}>
        {active ? 'Забрать на счёт' : 'Копится автоматически'}
      </span>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          lineHeight: 1.2,
          opacity: 0.85,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {active
          ? `+${formatTokens(pending)} на баланс`
          : `${formatTokens(ratePerHour)} /час · ${perClick}`}
      </span>
    </motion.button>
  );
};

/** Подпись «раз в 999 мс» под кнопкой, когда копить нечего. */
const autoclickLabel = (coinsPerTap: number): string => {
  const interval = Math.round(getAutoclickIntervalMs());
  return `${coinsPerTap} микро за клик · раз в ${interval} мс`;
};