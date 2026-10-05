/**
 * Хук бустов со стаком применений.
 *
 * Состояние бустов пишется в CloudStorage одним ключом и дублируется
 * в localStorage — по тем же причинам, что и прогресс (см.
 * progressStorage.ts): одиночный облачный запрос нельзя считать
 * успешным, мост Telegram умеет резолвиться вхолостую.
 *
 * Бусты не влияют на баланс сами по себе: они отдают множители, а
 * применение остаётся за useProgress.
 */

import { cloudStorage } from '@tma.js/sdk-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  BOOSTS,
  MAX_CHARGES,
  advanceBoost,
  getBoostView,
  readyBoostState,
  type BoostDef,
  type BoostId,
  type BoostState,
} from '@/lib/boosts.ts';

const BOOSTS_KEY = 'wc_boosts_v1';
const BOOSTS_MIRROR_KEY = 'wc_boosts_v1_mirror';

/** Тик обновления таймеров на кнопках. Чаще секунды незаметны, чаще — лишние ререндеры. */
const TICK_MS = 500;

const initialStates = (): Record<BoostId, BoostState> => ({
  turboTap: readyBoostState(),
  regen: readyBoostState(),
  jackpot: readyBoostState(),
});

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
};

const sanitizeStates = (raw: unknown): Record<BoostId, BoostState> | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const out = initialStates();
  let seen = false;
  for (const def of BOOSTS) {
    const v = obj[def.id];
    if (typeof v !== 'object' || v === null) continue;
    const rec = v as Record<string, unknown>;
    // Без поля charges запись старой схемы (одна метка времени) —
    // безопаснее счесть буст пустым, чем угадывать остаток зарядов.
    if (typeof rec.charges !== 'number') continue;
    out[def.id] = {
      charges: Math.min(num(rec.charges), MAX_CHARGES),
      workUntil: num(rec.workUntil),
      refillAt: num(rec.refillAt),
    };
    seen = true;
  }
  return seen ? out : null;
};

const readLocal = (): Record<BoostId, BoostState> | null => {
  try {
    return sanitizeStates(JSON.parse(localStorage.getItem(BOOSTS_MIRROR_KEY) ?? 'null'));
  } catch {
    return null;
  }
};

const defOf = (id: BoostId): BoostDef | undefined =>
  BOOSTS.find((b) => b.id === id);

export const useBoosts = () => {
  const [states, setStates] = useState<Record<BoostId, BoostState>>(initialStates);
  const [now, setNow] = useState(() => Date.now());
  const [loaded, setLoaded] = useState(false);
  const statesRef = useRef(states);
  statesRef.current = states;

  // Загрузка: зеркало важнее облака, там может лежать более свежая запись.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const local = readLocal();
      let cloud: Record<BoostId, BoostState> | null = null;
      try {
        const raw = (await cloudStorage.getItem(BOOSTS_KEY)) ?? '';
        cloud = sanitizeStates(JSON.parse(raw));
      } catch {
        // Облако недоступно или значение повреждено — берём зеркало.
      }
      if (cancelled) return;

      const at = Date.now();
      setNow(at);
      const best = local ?? cloud;
      if (best) {
        // Заряды дозаряжаются за всё время, пока приложение было закрыто.
        const next = { ...best };
        for (const def of BOOSTS) {
          next[def.id] = advanceBoost(best[def.id], def, at);
        }
        setStates(next);
      }
      setLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Тик: двигает таймеры работы и доливает заряды.
  useEffect(() => {
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);

      let changed = false;
      const next = { ...statesRef.current };
      for (const def of BOOSTS) {
        const advanced = advanceBoost(next[def.id], def, t);
        if (
          advanced.charges !== next[def.id].charges ||
          advanced.workUntil !== next[def.id].workUntil ||
          advanced.refillAt !== next[def.id].refillAt
        ) {
          next[def.id] = advanced;
          changed = true;
        }
      }
      if (changed) setStates(next);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  // Сохранение при смене состояния.
  useEffect(() => {
    if (!loaded) return;
    const payload = JSON.stringify(states);
    try {
      localStorage.setItem(BOOSTS_MIRROR_KEY, payload);
    } catch {
      // Зеркало недоступно — пишем только в облако.
    }
    void (async () => {
      try {
        await cloudStorage.setItem(BOOSTS_KEY, payload);
      } catch {
        // Останется в зеркале, досылается при следующем запуске.
      }
    })();
  }, [states, loaded]);

  /** Тратит один заряд буста и запускает его работу. */
  const activate = useCallback((id: BoostId) => {
    const def = defOf(id);
    if (!def) return;
    const t = Date.now();
    const current = statesRef.current[id] ?? readyBoostState();
    const view = getBoostView(current, t);

    // Во время работы тратить заряд нельзя: игрок не сможет
    // продлить эффект до того, как предыдущий закончится.
    if (view.working || view.charges <= 0) return;

    const charges = view.charges - 1;
    // Заряды кончились — запускаем откат, возвращающий по одному.
    const refillAt = charges === 0 ? t + def.refillMs : current.refillAt;

    setStates((prev) => ({
      ...prev,
      [id]: { charges, workUntil: t + def.workMs, refillAt },
    }));
  }, []);

  /** Идёт ли работа буста прямо сейчас — от этого зависят множители. */
  const isWorking = useCallback(
    (id: BoostId) => {
      const def = defOf(id);
      if (!def) return false;
      return getBoostView(statesRef.current[id] ?? readyBoostState(), Date.now()).working;
    },
    [],
  );

  return { states, now, activate, isWorking, loaded };
};