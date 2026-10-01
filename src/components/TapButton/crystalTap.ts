/**
 * Рантайм-обёртка над сгенерированным ассетом.
 *
 * Источник правды: src/assets/crystal.json, который создаёт
 * scripts/pixel-art/crystal.mjs. Вручную данные здесь НЕ хранятся —
 * при изменении спрайта правится генератор, потом запускается:
 *
 *   node scripts/pixel-art/crystal.mjs
 *
 * Формат: ОДИН символ строки = ОДИН пиксель, ' ' = прозрачный.
 * Палитра строго односимвольная (см. meta.encoding в JSON).
 */
import crystal from '@/assets/crystal.json';

export const SPRITE_W = crystal.meta.width;
export const SPRITE_H = crystal.meta.height;

/**
 * Палитра: символ пикселя → цвет.
 * null означает прозрачный пиксель (в JSON ключ ' ' хранит null).
 */
export const PALETTE: Record<string, string | null> = crystal.palette;

export const IDLE: string[] = crystal.idle;
export const PRESSED: string[] = crystal.pressed;

/** Цветной пиксель или null для прозрачного. */
export function pixelColor(ch: string): string | null {
  if (ch === crystal.meta.transparentChar) return null;
  return PALETTE[ch] ?? null;
}