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
  angle: number;
  startRadius: number;
  distance: number;
  rotation: number;
  scale: number;
  delay: number;
}

const BURST_COUNT = 4;
const PARTICLE_LIFETIME = 700;
// Радиус кнопки (круг 260px) — частицы стартуют на его границе.
const BUTTON_RADIUS = 130;

export const TapButton: FC<TapButtonProps> = ({ gender, onTap, disabled }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const coinImg = gender === 'female' ? woCoinImg : manCoinImg;

  const spawnBurst = useCallback(() => {
    const now = Date.now();
    const next: Particle[] = Array.from({ length: BURST_COUNT }, () => {
      // Частица расходится из центра по всему периметру,
      // стартуя на краю кнопки и вылетая за её границу.
      const angle = (Math.PI * 2 * Math.random()) - Math.PI;
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
          border: '2px solid rgba(30,53,87,0.85)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background:
            'radial-gradient(circle at 35% 30%, #ffffff 0%, #eaf7ff 55%, #d6efff 100%)',
          boxShadow:
            '0 2px 0 rgba(30,53,87,0.35), 0 4px 0 rgba(30,53,87,0.2), 0 14px 30px rgba(30,53,87,0.16)',
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
        {/* Слой карандашной штриховки поверх бумаги */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            pointerEvents: 'none',
            opacity: 0.5,
            backgroundImage:
              'repeating-linear-gradient(118deg, rgba(30,53,87,0.12) 0px, rgba(30,53,87,0.12) 1px, transparent 1px, transparent 4px), repeating-linear-gradient(62deg, rgba(30,53,87,0.08) 0px, rgba(30,53,87,0.08) 1px, transparent 1px, transparent 5px)',
            mixBlendMode: 'multiply',
          }}
        />
        <img
          src={coinImg}
          alt="WomanCoin"
          style={{
            width: '76%',
            height: '76%',
            objectFit: 'contain',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />
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