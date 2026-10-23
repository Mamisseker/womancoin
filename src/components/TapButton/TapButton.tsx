import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useRef, useState, type FC } from 'react';

import type { Gender } from '@/hooks/useGender.ts';
import { formatTokens } from '@/lib/units.ts';

import manCoinImg from './Man-coin.png';
import woCoinImg from './Wo-coin.png';

interface TapButtonProps {
  gender?: Gender;
  /** Возвращает, сколько начислено и был ли крит — без этого плашка не вылетит. */
  onTap: () => { amount: number; crit: boolean } | null;
  disabled?: boolean;
}

interface CritBadge {
  id: number;
  amount: number;
  /** Сдвиг по горизонтали, чтобы подряд идущие криты не легли друг на друга. */
  offset: number;
}

interface Particle {
  id: number;
  angle: number;
  startRadius: number;
  distance: number;
  rotation: number;
  scale: number;
  delay: number;
}

const BURST_COUNT = 4;
const PARTICLE_LIFETIME = 1200;
// Радиус круглой кнопки (260px) — частицы стартуют на его границе.
const BUTTON_RADIUS = 130;
const PARTICLE_SIZE = 24;
/** Сколько живёт серая плашка с суммой крита. */
const BADGE_LIFETIME = 1200;
const BADGE_ANIMATION = 1100;
/** Максимум одновременных плашек — при быстрых тапах они плодятся. */
const BADGE_LIMIT = 8;

/**
 * Трещина на монете в момент крита: главный разлом сверху вниз и
 * короткие отводки. Рисуем SVG-путями, а не спрайтом: линия остаётся
 * резкой на любом DPI и ничего не весит.
 */
const CRACK_MAIN =
  'M 50 6 L 45 21 L 53 32 L 42 46 L 55 57 L 46 71 L 54 84 L 50 95';
const CRACK_BRANCHES = [
  'M 53 32 L 66 26 L 75 29',
  'M 42 46 L 28 39 L 20 43',
  'M 55 57 L 69 63 L 77 60',
  'M 46 71 L 33 77',
];
/** Сколько трещина держится, прежде чем растаять. */
const CRACK_LIFETIME = 1000;

export const TapButton: FC<TapButtonProps> = ({ gender, onTap, disabled }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [badges, setBadges] = useState<CritBadge[]>([]);
  // Живёт ровно одна трещина: новый крит перерисовывает её заново.
  const [crack, setCrack] = useState<{ id: number } | null>(null);
  const crackId = useRef(0);
  const coinImg = gender === 'female' ? woCoinImg : manCoinImg;

  const spawnBurst = useCallback(() => {
    const now = Date.now();
    const next: Particle[] = Array.from({ length: BURST_COUNT }, () => {
      // Частица расходится из центра по всему периметру,
      // стартуя на краю кнопки и вылетая за её границу.
      const angle = Math.PI * 2 * Math.random() - Math.PI;
      const jitter = (Math.random() - 0.5) * 14;
      return {
        id: now + Math.random(),
        angle,
        startRadius: BUTTON_RADIUS + jitter,
        distance: 50 + Math.random() * 110,
        rotation: (Math.random() - 0.5) * 260,
        scale: 0.55 + Math.random() * 0.7,
        delay: Math.random() * 0.05,
      };
    });

    setParticles((p) => [...p, ...next]);

    window.setTimeout(() => {
      setParticles((p) => p.filter((part) => !next.includes(part)));
    }, PARTICLE_LIFETIME);
  }, []);

  /** Серая плашка с суммой крита: вылетает из центра монеты и гаснет. */
  const spawnBadge = (amount: number) => {
    const badge: CritBadge = {
      id: Date.now() + Math.random(),
      amount,
      offset: (Math.random() - 0.5) * 110,
    };

    setBadges((list) => [...list, badge].slice(-BADGE_LIMIT));
    window.setTimeout(() => {
      setBadges((list) => list.filter((item) => item.id !== badge.id));
    }, BADGE_LIFETIME);
  };

  /** Разлом: прочерчиваем трещину по монете и даём ей растаять. */
  const spawnCrack = () => {
    crackId.current += 1;
    const id = crackId.current;
    setCrack({ id });
    window.setTimeout(() => {
      setCrack((current) => (current && current.id === id ? null : current));
    }, CRACK_LIFETIME);
  };

  const handleClick = () => {
    if (disabled) return;
    spawnBurst();
    const result = onTap();
    if (result?.crit) {
      spawnBadge(result.amount);
      spawnCrack();
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <motion.button
        ref={buttonRef}
        onClick={handleClick}
        disabled={disabled}
        whileTap={{ scale: 0.93 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        style={{
          width: 260,
          height: 260,
          borderRadius: '50%',
          border: 0,
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: 'linear-gradient(145deg, var(--wc-accent), var(--wc-accent-2))',
          boxShadow: '0 14px 40px var(--wc-glow), var(--wc-shadow-1)',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          outline: 'none',
          position: 'relative',
          zIndex: 2,
          overflow: 'hidden',
          opacity: disabled ? 0.4 : 1,
          filter: disabled ? 'saturate(0.5)' : 'none',
          transition: 'opacity 0.2s ease',
        }}
      >
        <img
          src={coinImg}
          alt="WomanCoin"
          style={{
            width: '78%',
            height: '78%',
            objectFit: 'contain',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />

        {/* Разлом поверх монеты: трещина прорезается по пути и гаснет. */}
        <AnimatePresence>
          {crack && (
            <motion.div
              key={crack.id}
              aria-hidden
              initial={{ opacity: 1 }}
              animate={{ x: [0, -1.5, 1.5, -1, 0] }}
              exit={{ opacity: 0 }}
              transition={{
                x: { duration: 0.35, ease: 'easeOut' },
                opacity: { duration: 0.25 },
              }}
              style={{
                position: 'absolute',
                inset: '11%',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            >
              <svg viewBox="0 0 100 100" width="100%" height="100%">
                <motion.path
                  d={CRACK_MAIN}
                  fill="none"
                  stroke="#2b1400"
                  strokeWidth={1.9}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.9 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
                {CRACK_BRANCHES.map((d, index) => (
                  <motion.path
                    key={d}
                    d={d}
                    fill="none"
                    stroke="#2b1400"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.75 }}
                    transition={{
                      duration: 0.22,
                      ease: 'easeOut',
                      delay: 0.1 + index * 0.035,
                    }}
                  />
                ))}
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Монеты, вылетающие из периметра кнопки */}
      <AnimatePresence>
        {particles.map((part) => (
          <motion.img
            key={part.id}
            src={coinImg}
            alt=""
            initial={{
              x: Math.cos(part.angle) * part.startRadius,
              y: Math.sin(part.angle) * part.startRadius,
              opacity: 1,
              scale: 0.3,
              rotate: 0,
            }}
            animate={{
              x: Math.cos(part.angle) * (part.startRadius + part.distance),
              y: Math.sin(part.angle) * (part.startRadius + part.distance),
              opacity: 0,
              scale: part.scale,
              rotate: part.rotation,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: part.delay }}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              // Центрируем частицу на точке старта, а не её левый верхний угол.
              marginLeft: -PARTICLE_SIZE / 2,
              marginTop: -PARTICLE_SIZE / 2,
              width: PARTICLE_SIZE,
              height: PARTICLE_SIZE,
              objectFit: 'contain',
              pointerEvents: 'none',
              zIndex: 3,
              willChange: 'transform, opacity',
            }}
          />
        ))}
      </AnimatePresence>

      {/* Крит: просто серые цифры, поднимаются от монеты и гаснут */}
      <AnimatePresence>
        {badges.map((badge) => (
          <motion.div
            key={badge.id}
            initial={{ opacity: 0, y: 40, scale: 0.55, x: badge.offset }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: [40, -34, -84, -136],
              scale: [0.55, 1.14, 1, 1],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: BADGE_ANIMATION / 1000, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 54,
              display: 'flex',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 4,
              willChange: 'transform, opacity',
            }}
          >
            <span
              style={{
                // Без плашки и свечения: чистые серые цифры, читаемые
                // и на тёмном фоне, и поверх оранжевой монеты.
                color: '#b9bdc6',
                fontSize: 16,
                fontWeight: 900,
                lineHeight: 1.2,
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}
            >
              +{formatTokens(badge.amount)}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};