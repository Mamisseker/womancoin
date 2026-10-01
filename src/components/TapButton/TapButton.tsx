import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useRef, useState, type FC } from 'react';

import type { Gender } from '@/hooks/useGender.ts';

import { CrystalSprite } from './CrystalTap.tsx';
import manCoinImg from './Man-coin.png';
import woCoinImg from './Wo-coin.png';

interface TapButtonProps {
  gender?: Gender;
  onTap: () => void;
  disabled?: boolean;
}

interface Particle {
  id: number;
  angle: number;
  startX: number;
  startY: number;
  distance: number;
  rotation: number;
  scale: number;
  delay: number;
}

const BURST_COUNT = 4;
const PARTICLE_LIFETIME = 700;
const BUTTON_SIZE = 256;
const BUTTON_RADIUS = BUTTON_SIZE / 2;
/** Точка на периметре квадратной кнопки для угла направления. */
function squarePerimeter(angle: number, radius: number): { x: number; y: number } {
  const half = radius;
  // Проецируем луч на границу квадрата — частицы стартуют на его сторонах.
  const c = Math.abs(Math.cos(angle));
  const s = Math.abs(Math.sin(angle));
  const m = Math.max(c, s);
  return { x: (Math.cos(angle) / m) * half, y: (Math.sin(angle) / m) * half };
}

export const TapButton: FC<TapButtonProps> = ({ gender, onTap, disabled }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [pressed, setPressed] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const coinImg = gender === 'female' ? woCoinImg : manCoinImg;

  const spawnBurst = useCallback(() => {
    const now = Date.now();
    const next: Particle[] = Array.from({ length: BURST_COUNT }, () => {
      // Частица расходится из центра по всему периметру,
      // стартуя на границе кнопки и вылетая за её пределы.
      const angle = Math.PI * 2 * Math.random() - Math.PI;
      const jitter = (Math.random() - 0.5) * 10;
      const start = squarePerimeter(angle, BUTTON_RADIUS + jitter);
      return {
        id: now + Math.random(),
        angle,
        startX: start.x,
        startY: start.y,
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

  const handleClick = () => {
    if (disabled) return;
    spawnBurst();
    setBurstKey((k) => k + 1);
    onTap();
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <motion.button
        ref={buttonRef}
        onClick={handleClick}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        disabled={disabled}
        aria-label="Тапнуть"
        transition={{ type: 'spring', stiffness: 500, damping: 24 }}
        style={{
          width: BUTTON_SIZE,
          height: BUTTON_SIZE,
          padding: 0,
          border: 0,
          borderRadius: 16,
          background: 'transparent',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          outline: 'none',
          position: 'relative',
          zIndex: 2,
          overflow: 'visible',
          opacity: disabled ? 0.5 : 1,
          filter: disabled ? 'saturate(0.5) brightness(0.9)' : 'none',
          transition: 'opacity 0.15s ease, filter 0.15s ease',
        }}
      >
        <CrystalSprite pressed={pressed} burstKey={burstKey} size={BUTTON_SIZE} />
      </motion.button>

      {/* Монеты, вылетающие из периметра кнопки */}
      <AnimatePresence>
        {particles.map((part) => (
          <motion.img
            key={part.id}
            src={coinImg}
            alt=""
            initial={{
              x: part.startX,
              y: part.startY,
              opacity: 1,
              scale: 0.3,
              rotate: 0,
            }}
            animate={{
              x: part.startX + Math.cos(part.angle) * part.distance,
              y: part.startY + Math.sin(part.angle) * part.distance,
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
              marginLeft: -15,
              marginTop: -15,
              width: 30,
              height: 30,
              objectFit: 'contain',
              pointerEvents: 'none',
              zIndex: 3,
              imageRendering: 'pixelated',
              willChange: 'transform, opacity',
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
