import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useRef, useState, type FC } from 'react';

import type { Gender } from '@/hooks/useGender.ts';

import manCoinImg from './Man-coin.png';
import woCoinImg from './Wo-coin.png';
import crackFrame1 from './crack/f001.png';
import crackFrame2 from './crack/f002.png';
import crackFrame3 from './crack/f003.png';
import crackFrame4 from './crack/f004.png';
import crackFrame5 from './crack/f005.png';
import crackFrame6 from './crack/f006.png';
import crackFrame7 from './crack/f007.png';
import crackFrame8 from './crack/f008.png';
import crackFrame9 from './crack/f009.png';
import crackFrame10 from './crack/f010.png';
import crackFrame11 from './crack/f011.png';
import crackFrame12 from './crack/f012.png';
import crackFrame13 from './crack/f013.png';
import crackFrame14 from './crack/f014.png';
import crackFrame15 from './crack/f015.png';
import compFrame1 from './crack_mov/f001.png';
import compFrame2 from './crack_mov/f002.png';
import compFrame3 from './crack_mov/f003.png';
import compFrame4 from './crack_mov/f004.png';
import compFrame5 from './crack_mov/f005.png';
import compFrame6 from './crack_mov/f006.png';

interface TapButtonProps {
  gender?: Gender;
  /** Возвращает, сколько начислено и был ли крит — без этого не будет трещины. */
  onTap: () => { amount: number; crit: boolean } | null;
  disabled?: boolean;
}

const CRACK_FRAMES = [crackFrame1, crackFrame2, crackFrame3, crackFrame4, crackFrame5, crackFrame6, crackFrame7, crackFrame8, crackFrame9, crackFrame10, crackFrame11, crackFrame12, crackFrame13, crackFrame14, crackFrame15];
const CRACK_FRAMES2 = [compFrame1, compFrame2, compFrame3, compFrame4, compFrame5, compFrame6];

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
/** Длительность покадрового разлома из видео. */
const CRACK_FRAMES_MS = 500;
const CRACK_FADE_MS = 200;

export const TapButton: FC<TapButtonProps> = ({ gender, onTap, disabled }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  // Живёт ровно одна трещина: новый крит перерисовывает её заново.
  const [crack, setCrack] = useState<{ id: number; rot: number; frames: string[] } | null>(null);
  const [crackFrame, setCrackFrame] = useState(0);
  const crackId = useRef(0);
  const crackTimer = useRef<number | null>(null);
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

  /** Разлом: проигрываем покадровую анимацию из видео «Разлом». */
  const spawnCrack = () => {
    if (crackTimer.current !== null) {
      window.clearInterval(crackTimer.current);
    }
    crackId.current += 1;
    const id = crackId.current;
    const frames = Math.random() < 0.5 ? CRACK_FRAMES : [...CRACK_FRAMES2].reverse();
    setCrack({ id, rot: Math.random() * 360, frames });
    setCrackFrame(0);

    const total = frames.length;
    const interval = Math.max(16, Math.floor(CRACK_FRAMES_MS / total));
    let frame = 0;
    crackTimer.current = window.setInterval(() => {
      frame += 1;
      if (frame >= total) {
        if (crackTimer.current !== null) {
          window.clearInterval(crackTimer.current);
          crackTimer.current = null;
        }
        window.setTimeout(() => {
          setCrack((current) => (current && current.id === id ? null : current));
        }, CRACK_FADE_MS);
        return;
      }
      setCrackFrame(frame);
    }, interval);
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

        {/* Разлом поверх монеты: покадровая анимация из видео "Разлом". */}
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
                opacity: { duration: 0.22 },
              }}
              style={{
                position: 'absolute',
                inset: '11%',
                pointerEvents: 'none',
                zIndex: 1,
                overflow: 'hidden',
                borderRadius: '50%',
                transform: `rotate(${crack.rot}deg)`,
              }}
            >
              <img
                src={crack.frames[crackFrame]}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  objectFit: 'cover',
                  pointerEvents: 'none',
                }}
              />
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