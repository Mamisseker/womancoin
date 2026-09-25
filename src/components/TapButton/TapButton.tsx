import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useRef, useState, type FC } from 'react';

import type { Gender } from '@/hooks/useGender.ts';

import manCoinImg from './Man-coin.png';
import woCoinImg from './Wo-coin.png';

interface TapButtonProps {
  gender?: Gender;
  onTap: () => void;
  disabled?: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  delay: number;
}

const BURST_COUNT = 7;
const PARTICLE_LIFETIME = 700;

export const TapButton: FC<TapButtonProps> = ({ gender, onTap, disabled }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const coinImg = gender === 'female' ? woCoinImg : manCoinImg;

  const spawnBurst = useCallback(() => {
    const now = Date.now();
    const next: Particle[] = Array.from({ length: BURST_COUNT }, () => {
      // Основной вектор — вверх, с лёгким разбросом в стороны.
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.7;
      const distance = 90 + Math.random() * 120;
      return {
        id: now + Math.random(),
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance - 20,
        rotation: (Math.random() - 0.5) * 200,
        scale: 0.7 + Math.random() * 0.8,
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
    onTap();
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
            width: '82%',
            height: '82%',
            objectFit: 'contain',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />
      </motion.button>

      {/* Монеты, вылетающие при тапе */}
      <AnimatePresence>
        {particles.map((part) => (
          <motion.img
            key={part.id}
            src={coinImg}
            alt=""
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.3, rotate: 0 }}
            animate={{
              x: part.x,
              y: part.y,
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
              width: 30,
              height: 30,
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