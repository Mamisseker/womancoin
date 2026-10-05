/**
 * Вкладка «Завод»: карусель своих заводов и сбор продукции.
 *
 * Заводы вынесены в горизонтальную ленту не ради экономики, а ради
 * будущего: игрок листает по своим заводам, и когда их станет больше
 * трёх, лента просто продолжится, а не переедет в новую вёрстку.
 *
 * Продукция копится сама, пока игрок не забирает её зелёной кнопкой.
 * Кнопка загорается ярко-зелёным, когда есть что забирать, и на ней
 * видно, сколько именно накопилось.
 */

import { hapticFeedback } from '@tma.js/sdk-react';
import { motion } from 'framer-motion';
import type { FC } from 'react';

import { FACTORIES, type FactoryDef } from '@/hooks/useFactories.ts';
import { formatTokens } from '@/lib/units.ts';

const CARD_WIDTH = 148;
const CARD_HEIGHT = 190;
/** Ширина зелёной кнопки совпадает с шириной карточки завода. */
const COLLECT_WIDTH = CARD_WIDTH;

interface FactoryPageProps {
  /** Накопленная продукция, микро-единицы. */
  pending: number;
  onCollect: () => void;
  /** Заводы ещё считаются (первая загрузка) — кнопку держим неактивной. */
  loading?: boolean;
}

export const FactoryPage: FC<FactoryPageProps> = ({ pending, onCollect, loading }) => {
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
        gap: 18,
        paddingTop: 20,
        paddingBottom: 24,
        position: 'relative',
        zIndex: 1,
      }}
    >
      {/* Заголовок */}
      <div style={{ paddingLeft: 20, paddingRight: 20 }}>
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
          Листай, чтобы посмотреть все. Продукция копится сама.
        </div>
      </div>

      {/* Лента заводов */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          paddingLeft: 20,
          paddingRight: 20,
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
      >
        {FACTORIES.map((def) => (
          <FactoryCard key={def.id} def={def} />
        ))}

        {/* Заглушка будущих заводов: видно, что лента продолжится */}
        <div
          style={{
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            flexShrink: 0,
            borderRadius: 'var(--wc-radius-m)',
            border: '1px dashed var(--wc-separator)',
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            color: 'var(--wc-text-3)',
          }}
        >
          <span style={{ fontSize: 26, lineHeight: 1, opacity: 0.6 }}>＋</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              textAlign: 'center',
              padding: '0 10px',
              lineHeight: 1.3,
            }}
          >
            Скоро новый завод
          </span>
        </div>
      </div>

      {/* Приёмник продукции */}
      <div style={{ paddingLeft: 20, paddingRight: 20 }}>
        <CollectButton
          pending={pending}
          active={hasLoot}
          disabled={loading}
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
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        flexShrink: 0,
        scrollSnapAlign: 'start',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--wc-surface)',
        border: '1px solid var(--wc-separator)',
        borderRadius: 'var(--wc-radius-m)',
        overflow: 'hidden',
        boxShadow: 'var(--wc-shadow-1)',
      }}
    >
      <img
        src={def.image}
        alt={def.title}
        style={{
          width: '100%',
          height: 118,
          objectFit: 'cover',
          display: 'block',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 2,
          padding: '10px 12px',
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--wc-text)',
            lineHeight: 1.2,
          }}
        >
          {def.title}
        </div>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--wc-text-3)' }}>
          {def.detail}
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: 'var(--wc-accent)',
            fontVariantNumeric: 'tabular-nums',
            marginTop: 3,
          }}
        >
          +{formatTokens(def.ratePerHour)} /час
        </div>
      </div>
    </div>
  );
};

interface CollectButtonProps {
  pending: number;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}

/**
 * Зелёная кнопка приёма продукции.
 *
 * Ширина совпадает с карточкой завода. Когда продукция есть, кнопка
 * горит ярко-зелёным и слегка пульсирует, чтобы её было видно с
 * противоположного конца экрана; на ней же написано, сколько накопилось.
 * Одно нажатие переводит всё на счёт.
 */
const CollectButton: FC<CollectButtonProps> = ({ pending, active, disabled, onClick }) => {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!active || disabled}
      animate={active ? { scale: [1, 1.025, 1] } : { scale: 1 }}
      transition={
        active
          ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 0.2 }
      }
      whileTap={active ? { scale: 0.96 } : undefined}
      style={{
        width: COLLECT_WIDTH,
        maxWidth: '100%',
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
        // Ярко-зелёный, когда есть продукция; спокойный зелёный, когда пусто.
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
        {active ? 'Забрать продукцию' : 'Продукция копится'}
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
          ? `+${formatTokens(pending)} на счёт`
          : `Заводы работают · ${formatTokens(3300)} /час`}
      </span>
    </motion.button>
  );
};