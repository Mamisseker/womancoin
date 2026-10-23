import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useRef, useState, type FC } from 'react';

import type { Gender } from '@/hooks/useGender.ts';

import manCoinImg from './Man-coin.png';
import woCoinImg from './Wo-coin.png';

interface TapButtonProps {
  gender?: Gender;
  /** Возвращает, сколько начислено и был ли крит — без этого не будет трещины. */
  onTap: () => { amount: number; crit: boolean } | null;
  disabled?: boolean;
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
interface Crack {
  id: number;
  main: string;
  branches: string[];
  width: number;
}

/** Сколько трещина держится, прежде чем растаять. */
const CRACK_LIFETIME = 1000;

const rand = (min: number, max: number): number => min + Math.random() * (max - min);

/**
 * Новая трещина на каждый крит: старт в случайной точке на краю
 * монеты, изломанный путь к противоположной стороне и случайные
 * отводки. Форма каждый раз другая, поэтому разлом не примелькается.
 * Рисуем SVG-путями, а не спрайтом: линия резкая на любом DPI и
 * ничего не весит.
 */
const makeCrack = (): Omit<Crack, 'id'> => {
  const startAngle = Math.random() * Math.PI * 2;
  let x = 50 + Math.cos(startAngle) * 46;
  let y = 50 + Math.sin(startAngle) * 46;
  let heading = startAngle + Math.PI + rand(-0.5, 0.5);

  const steps = 6 + Math.floor(Math.random() * 4);
  const points = [`M ${x.toFixed(1)} ${y.toFixed(1)}`];
  const branches: string[] = [];

  for (let i = 0; i < steps; i += 1) {
    heading += rand(-0.45, 0.45);
    const length = i === steps - 1 ? rand(10, 18) : rand(6, 13);
    x += Math.cos(heading) * length;
    y += Math.sin(heading) * length;
    points.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`);

    // Отводка уходит в сторону примерно из половины изломов.
    if (i > 0 && i < steps - 1 && Math.random() < 0.5) {
      const side = Math.random() < 0.5 ? 1 : -1;
      const branchAngle = heading + side * rand(0.6, 1.1);
      const bx = x + Math.cos(branchAngle) * rand(6, 14);
      const by = y + Math.sin(branchAngle) * rand(6, 14);
      const tipAngle = branchAngle + rand(-0.5, 0.5);
      const tx = bx + Math.cos(tipAngle) * rand(4, 9);
      const ty = by + Math.sin(tipAngle) * rand(4, 9);
      branches.push(
        `M ${x.toFixed(1)} ${y.toFixed(1)} L ${bx.toFixed(1)} ${by.toFixed(1)} L ${tx.toFixed(1)} ${ty.toFixed(1)}`,
      );
    }
  }

  return { main: points.join(' '), branches, width: rand(1.5, 2.2) };
};

export const TapButton: FC<TapButtonProps> = ({ gender, onTap, disabled }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  // Живёт ровно одна трещина: новый крит перерисовывает её заново.
  const [crack, setCrack] = useState<Crack | null>(null);
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

  /** Разлом: генерируем новую трещину и даём ей растаять. */
  const spawnCrack = () => {
    crackId.current += 1;
    const id = crackId.current;
    setCrack({ id, ...makeCrack() });
    window.setTimeout(() => {
      setCrack((current) => (current && current.id === id ? null : current));
    }, CRACK_LIFETIME);
  };

  const handleClick = () => {
    if (disabled) return;
    spawnBurst();
    const result = onTap();
    if (result?.crit) spawnCrack();
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
                <defs>
                  <clipPath id={`wc-crack-clip-${crack.id}`}>
                    <circle cx="50" cy="50" r="46" />
                  </clipPath>
                </defs>
                <g clipPath={`url(#wc-crack-clip-${crack.id})`}>
                  <motion.path
                    d={crack.main}
                    fill="none"
                    stroke="#2b1400"
                    strokeWidth={crack.width}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.9 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                  {crack.branches.map((d, index) => (
                    <motion.path
                      key={`${crack.id}-b${index}`}
                      d={d}
                      fill="none"
                      stroke="#2b1400"
                      strokeWidth={crack.width * 0.8}
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
                </g>
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
    </div>
  );
};