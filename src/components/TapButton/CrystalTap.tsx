import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, type CSSProperties, type FC } from 'react';

import {
  IDLE,
  pixelColor,
  PRESSED,
  SPRITE_H,
  SPRITE_W,
} from '@/components/TapButton/crystalTap';

/**
 * Размер одного пикселя спрайта в SVG-координатах.
 * 4 = sprite_width при 140–196 px. Всё целое, поэтому края жёсткие.
 */
const PIXEL = 4;

interface PixelSpriteProps {
  rows: string[];
  style?: CSSProperties;
}

/**
 * Рендерит спрайт как чёткую пиксель-сетку: один символ — один квадрат.
 *
 * Важно: viewBox и width/height используют ОДНО И ТО ЖЕ масштабное
 * отношение, поэтому пиксели остаются квадратными. Спрайт 28x36
 * пропорциями 7:9 — растягивать его в квад нельзя.
 */
export const PixelSprite: FC<PixelSpriteProps> = ({ rows, style }) => {
  const vw = SPRITE_W * PIXEL;
  const vh = SPRITE_H * PIXEL;

  const cells = useMemo(() => {
    const out: { key: string; fill: string; x: number; y: number }[] = [];
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x += 1) {
        const fill = pixelColor(row[x]);
        if (!fill) continue;
        out.push({ key: `${x}-${y}`, fill, x, y });
      }
    });
    return out;
  }, [rows]);

  return (
    <svg
      width={vw}
      height={vh}
      viewBox={`0 0 ${vw} ${vh}`}
      shapeRendering="crispEdges"
      style={{ imageRendering: 'pixelated', display: 'block', ...style }}
      role="img"
      aria-label="Кристалл"
    >
      {cells.map((c) => (
        <rect
          key={c.key}
          x={c.x * PIXEL}
          y={c.y * PIXEL}
          width={PIXEL}
          height={PIXEL}
          fill={c.fill}
        />
      ))}
    </svg>
  );
};

/** Целочисленный масштаб спрайта под доступную высоту. */
function fitScale(maxHeight: number): number {
  return Math.max(1, Math.floor(maxHeight / SPRITE_H));
}

interface CrystalSpriteProps {
  pressed: boolean;
  /** Инкремент при каждом тапе — перезапускает анимацию отклика. */
  burstKey: number;
  /** Размер контейнера (кнопка). Спрайт центрируется внутри. */
  size: number;
}

/**
 * Спрайт кристалла: idle/pressed состояния + короткий пиксельный отклик.
 * Неинтерактивный — сама кнопка-хост обрабатывает нажатия.
 */
export const CrystalSprite: FC<CrystalSpriteProps> = ({ pressed, burstKey, size }) => {
  const rows = pressed ? PRESSED : IDLE;
  const scale = fitScale(Math.round(size * 0.78));

  return (
    <div
      style={{
        position: 'relative',
        display: 'grid',
        placeItems: 'center',
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence>
        {burstKey > 0 && (
          <motion.span
            key={burstKey}
            initial={{ opacity: 0.8, scale: 0.82 }}
            animate={{ opacity: 0, scale: 1.25 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              width: SPRITE_W * scale,
              height: SPRITE_H * scale,
              border: '3px solid rgba(133, 234, 184, 0.9)',
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>
      <PixelSprite
        rows={rows}
        style={{
          width: SPRITE_W * scale,
          height: SPRITE_H * scale,
          // Ступенчатое смещение вниз при нажатии — без плавного скольжения.
          transform: pressed ? 'translateY(3px)' : 'translateY(0)',
          transition: 'transform 60ms steps(2, end)',
        }}
      />
    </div>
  );
};