import { motion } from 'framer-motion';
import { useReward } from 'partycles';
import { useRef, type FC } from 'react';

import manCoinImg from './Man-coin.png';

interface TapButtonProps {
  onTap: () => void;
  disabled?: boolean;
}

export const TapButton: FC<TapButtonProps> = ({ onTap, disabled }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { reward: coinReward } = useReward(buttonRef, 'coins', {
    particleCount: 12,
    spread: 80,
    startVelocity: 35,
    elementSize: 24,
    lifetime: 1200,
  });

  const handleClick = () => {
    if (disabled) return;
    void coinReward();
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
          src={manCoinImg}
          alt="Man-coin"
          style={{
            width: '82%',
            height: '82%',
            objectFit: 'contain',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />
      </motion.button>
    </div>
  );
};