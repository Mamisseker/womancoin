/**
 * Хук временных бустов с кулдауном.
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
  getBoostPhase,
  getPhaseLeft,
  type BoostId,
  type BoostState,
} from '@/lib/boosts.ts';

const BOOSTS_KEY = 'wc_boosts_v1';
const BOOSTS_MIRROR_KEY = 'wc_boosts_v1_mirror';

/** Тик обновления таймеров на кнопках. Чаще секунды незаметны, чаще — лишние ререндеры. */
const TICK_MS = 500;

const idleState = (): BoostState => ({ workUntil: 0, readyAt: 0 });

const initialStates = (): Record<BoostId, BoostState> => ({
  turboTap: idleState(),
  regen: idleState(),
  jackpot: idleState(),
});

const sanitizeStates = (raw: unknown): Record<BoostId, BoostState> | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const num = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  };
  const out = initialStates();
  let seen = false;
  for (const def of BOOSTS) {
    const v = obj[def.id];
    if (typeof v === 'object' && v !== null) {
      const rec = v as Record<string, unknown>;
      const readyAt = num(rec.readyAt);
      // Старая схема хранила одну метку `until`; переносим её в откат,
      // иначе бусты, нажатые до обновления, потеряли бы своё состояние.
      const workUntil = num(rec.workUntil);
      out[def.id] =
        readyAt === 0
          ? idleState()
          : { workUntil: Math.min(workUntil, readyAt), readyAt };
      seen = true;
    }
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

/**
 * Приводит состояние к «живому» виду на момент now.
 *
 * Это важно для честности кулдауна: отсчёт привязан к абсолютному
 * времени, поэтому закрытое приложение не «замораживает» таймеры.
 * Если к now откат уже истёк, буст сразу готов; если игрок вернулся
 * в разгар отката — откат продолжается с того же момента, а не
 * начинается заново.
 */
const normalize = (
  states: Record<BoostId, BoostState>,
  now: number,
): Record<BoostId, BoostState> => {
  const out = initialStates();
  for (const def of BOOSTS) {
    const state = states[def.id];
    if (!state || state.readyAt <= now) continue; // работа и откат истекли
    // Работа могла закончиться, пока приложение было закрыто:
    // тогда сразу показываем откат, а не «работающий» буст.
    out[def.id] = { workUntil: Math.min(state.workUntil, now), readyAt: state.readyAt };
  }
  return out;
};

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

      const best = local ?? cloud;
      const at = Date.now();
      setNow(at);
      if (best) setStates(normalize(best, at));
      setLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Тикер: двигает таймеры на кнопках и подводит бусты к концу фазы.
  useEffect(() => {
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);

      // Фаза закончилась — фиксируем «готов к применению», иначе
      // кнопка осталась бы заблокированной до перезапуска.
      let changed = false;
      const next = { ...statesRef.current };
      for (const def of BOOSTS) {
        const state = next[def.id];
        if (state.readyAt !== 0 && t >= state.readyAt) {
          next[def.id] = idleState();
          changed = true;
        }
      }
      if (changed) setStates(next);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  // Сохранение при смене фаз.
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

  const activate = useCallback(
    (id: BoostId) => {
      const def = BOOSTS.find((b) => b.id === id);
      if (!def) return;
      const t = Date.now();
      if (getBoostPhase(statesRef.current[id] ?? idleState(), t) !== 'ready') return;
      // Работа и откат идут подряд: работа начинается нажатием,
      // откат стартует в момент её окончания.
      setStates((prev) => ({
        ...prev,
        [id]: { workUntil: t + def.workMs, readyAt: t + def.workMs + def.cooldownMs },
      }));
    },
    [],
  );

  const isActive = useCallback(
    (id: BoostId) => getBoostPhase(statesRef.current[id] ?? idleState(), Date.now()) === 'work',
    [],
  );

  return { states, now, activate, isActive, loaded, getPhaseLeft };
};