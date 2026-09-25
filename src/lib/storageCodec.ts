/**
 * Лёгкое шифрование значений CloudStorage.
 *
 * Это НЕ стойкая криптография — ключ лежит в клиентском коде и не защищает
 * от по-настоящему упорного пользователя с полным доступом к бандлу.
 * Но это ломает «казуальный» взлом через DevTools/CloudStorage API:
 * нельзя просто подменить сохранённое число на глаз.
 *
 * Формат значения: "v1:" + base64( xor( data + ":" + checksum, key ) )
 */

const PREFIX = 'v1:';
const KEY = 'wc_obf_9x2K7pQzLmN4RtWvYbCjGdHsF0aE';

const xorWithKey = (input: string): string => {
  let out = '';
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i) ^ KEY.charCodeAt(i % KEY.length);
    out += String.fromCharCode(code);
  }
  return out;
};

const toB64 = (s: string): string => btoa(unescape(encodeURIComponent(s)));
const fromB64 = (s: string): string => decodeURIComponent(escape(atob(s)));

const checksum = (s: string): string =>
  Array.from(s).reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7).toString(36);

export const encrypt = (value: string): string => {
  const payload = `${value}:${checksum(value)}`;
  return PREFIX + toB64(xorWithKey(payload));
};

/**
 * Возвращает расшифрованное значение либо null, если значение
 * не в нашем формате или повреждено (не сошлась контрольная сумма).
 */
export const decrypt = (value: string): string | null => {
  if (!value.startsWith(PREFIX)) return null;
  try {
    const decoded = xorWithKey(fromB64(value.slice(PREFIX.length)));
    const sep = decoded.lastIndexOf(':');
    if (sep < 0) return null;
    const data = decoded.slice(0, sep);
    const sum = decoded.slice(sep + 1);
    return checksum(data) === sum ? data : null;
  } catch {
    return null;
  }
};