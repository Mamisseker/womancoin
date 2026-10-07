/**
 * Заводы: покупка, производство улучшений и их сбор.
 *
 * Состояние живёт отдельно от прогресса: баланс тут не трогается,
 * кроме списания за покупку, поэтому сбой в хранилище заводов не может
 * увести монеты. Паттерн записи повторяет прогресс — сначала синхронное
 * зеркало в localStorage, затем облачный запрос, и одно «успешное»
 * обращение к CloudStorage не считается подтверждённым.
 *
 * Старые ключи читаются один раз: в первой версии завода складывали
 * доход автокликера, и накопленное там нужно перевести на баланс,
 * а не выбросить.
 */

import { cloudStorage } from '@tma.js/sdk-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  advanceProduction,
  buyFactory,
  collectImprovements,
  computeFactoryBonuses,
  createFactoryState,
  FACTORIES,
  getFactoryProgress,
  type CollectResult,
  type FactoryBonuses,
  type FactoryId,
  type FactoryState,
} from '@/lib/factories.ts';

const STORAGE_KEY = 'wc_factories_v2';
const MIRROR_KEY = 'wc_factories_v2_mirror';
/** Прежние ключи: там лежит накопленный доход автокликера. */
const LEGACY_KEYS = [
  'wc_autoclicker_v1',
  'wc_autoclicker_v1_mirror',
  'wc_factories_v1',
  'wc_factories_v1_mirror',
];

/** Как часто обновляется обратный отсчёт до улучшения. */
const TICK_MS = 500;

const readJson = (raw: string | null): unknown => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const num = (value: unknown, fallback = 0): number => {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

const readState = (raw: string | null): FactoryState | null => {
  const parsed = readJson(raw);
  if (typeof parsed !== 'object' || parsed === null) return null;
  const o = parsed as Record<string, unknown>;
  if (typeof o.lvl !== 'object' || o.lvl === null) return null;

  const state = createFactoryState();
  for (const def of FACTORIES) {
    const level = num((o.lvl as Record<string, unknown>)[def.id]);
    if (level > 0) state.lvl[def.id] = level;
    const stock = num((o.stock as Record<string, unknown> | undefined)?.[def.id]);
    if (stock > 0) state.stock[def.id] = stock;
    const readyAt = num((o.readyAt as Record<string, unknown> | undefined)?.[def.id]);
    if (readyAt > 0) state.readyAt[def.id] = readyAt;
  }

  state.tapMicro = num(o.tapMicro);
  state.critBps = num(o.critBps);
  state.speedBps = num(o.speedBps);
  state.cooldownMs = num(o.cooldownMs);
  state.effBps = num(o.effBps);
  state.robot = num(o.robot);
  state.passiveBps = num(o.passiveBps);
  state.qualityBps = num(o.qualityBps);
  state.spaceUntil = num(o.spaceUntil);
  return state;
};

const serialize = (state: FactoryState): string => JSON.stringify(state);

/**
 * @param spend списывает монеты за покупку, false если не хватает
 * @param credit зачисляет накопленный ранее доход автокликера
 */
export const useFactories = (
  spend: (amount: number) => boolean,
  credit: (amount: number) => void,
) => {
  const [state, setState] = useState<FactoryState>(createFactoryState);
  const [now, setNow] = useState(() => Date.now());
  const [loaded, setLoaded] = useState(false);

  const stateRef = useRef(state);
  stateRef.current = state;
  const spendRef = useRef(spend);
  spendRef.current = spend;
  const creditRef = useRef(credit);
  creditRef.current = credit;

  // Загрузка: облако, зеркало и разовый перенос старого дохода.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      let stored: FactoryState | null = null;
      try {
        stored = readState((await cloudStorage.getItem(STORAGE_KEY)) ?? null);
      } catch {
        // облако недоступно — берём зеркало
      }
      if (cancelled) return;

      const mirror = readState(localStorage.getItem(MIRROR_KEY));
      const start = mirror ?? stored ?? createFactoryState();
      const at = Date.now();

      // Старый доход автокликера уезжает на баланс один раз.
      for (const key of LEGACY_KEYS) {
        const legacy = readJson(localStorage.getItem(key));
        if (typeof legacy === 'object' && legacy !== null) {
          const pending = num((legacy as Record<string, unknown>).k);
          if (pending > 0) creditRef.current(pending);
        }
        localStorage.removeItem(key);
      }

      stateRef.current = advanceProduction(start, at);
      setState(stateRef.current);
      setNow(at);
      setLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Тик: досчитывает производство и держит обратный отсчёт свежим.
  useEffect(() => {
    const id = window.setInterval(() => {
      const at = Date.now();
      setNow(at);
      const next = advanceProduction(stateRef.current, at);
      // Не дёргаем setState без изменений — иначе состояние перезаписывается
      // на каждой половине секунды и обнуляет уже сохранённое.
      if (JSON.stringify(next) !== JSON.stringify(stateRef.current)) {
        stateRef.current = next;
        setState(next);
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  // Сохранение: зеркало синхронно, облако следом.
  useEffect(() => {
    if (!loaded) return;
    const payload = serialize(state);
    try {
      localStorage.setItem(MIRROR_KEY, payload);
    } catch {
      // зеркало недоступно — пишем только в облако
    }
    void (async () => {
      try {
        await cloudStorage.setItem(STORAGE_KEY, payload);
      } catch {
        // останется в зеркале, досылается при следующем запуске
      }
    })();
  }, [state, loaded]);

  /** Покупает завод или поднимает его уровень. */
  const buy = useCallback((id: FactoryId): boolean => {
    const def = FACTORIES.find((f) => f.id === id);
    if (!def) return false;
    const current = stateRef.current;
    const level = current.lvl[id] ?? 0;
    const cost = Math.round(def.baseCost * Math.pow(4, level));
    if (!spendRef.current(cost)) return false;

    const at = Date.now();
    const next = buyFactory(current, id, at);
    stateRef.current = next;
    setState(next);
    setNow(at);
    return true;
  }, []);

  /** Забирает всё, что накопилось на складе заводов. */
  const collect = useCallback((id: FactoryId): CollectResult | null => {
    const current = stateRef.current;
    if ((current.stock[id] ?? 0) <= 0) return null;

    const at = Date.now();
    const result = collectImprovements(current, id, at);
    stateRef.current = result.state;
    setState(result.state);
    setNow(at);
    return result;
  }, []);

  const bonuses: FactoryBonuses = useMemo(() => computeFactoryBonuses(state, now), [state, now]);

  return {
    state,
    now,
    bonuses,
    loaded,
    buy,
    collect,
    /** Статус одной карточки — для рендера списка. */
    progressOf: (id: FactoryId) => {
      const def = FACTORIES.find((f) => f.id === id);
      return def ? getFactoryProgress(state, def, now) : null;
    },
  };
};