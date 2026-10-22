/**
 * Панель разработчика: добавление заводов и замена их картинок.
 *
 * Вход — пять нажатий подряд на заголовок «Мои заводы». Панель
 * привязана к юзернейму из initData: ПИН создается один раз, дальше
 * каждый вход требует его заново, а успешный вход открывает сессию
 * на 15 минут. Это не серверная защита — бэкенда у проекта нет, вся
 * логика живёт в браузере и защищает от постороннего взгляда на
 * этом устройстве.
 *
 * Правки хранятся только в localStorage: картинки весят десятки
 * килобайт, а cloudStorage отдаёт 4 КБ на ключ, поэтому в облако
 * их не положить. Игрокам эти заводы не показываются — чтобы правка
 * стала общей, её нужно отдельно зашить в код и задеплоить.
 */

import { initData } from '@tma.js/sdk-react';
import { useEffect, useState, type FC, type CSSProperties, type ReactNode } from 'react';

import {
  BUILTIN_FACTORY_IDS,
  BUILTIN_IMAGES,
  FACTORIES,
  FRIEND_REWARD,
  emptyCatalogPatch,
  readCatalogPatch,
  writeCatalogPatch,
  type CatalogPatch,
  type EffectKind,
  type FactoryDef,
  type FactoryId,
} from '@/lib/factories.ts';
import { MICRO, formatTokens } from '@/lib/units.ts';

interface DevPanelProps {
  onClose: () => void;
  /** Вызывается после каждой правки каталога — страница перерисовывает список. */
  onCatalogChange: () => void;
  /** Текущее число друзей — уровень дружеского завода. */
  friends: number;
  /** Задаёт число друзей; каждый новый сразу приносит монеты. */
  onSetFriends: (count: number) => void;
}

const OWNER_KEY = 'wc_dev_owner';
const PIN_KEY = 'wc_dev_pin';
const SESSION_KEY = 'wc_dev_session';
/** Сколько живёт разблокировка после ввода ПИНа. */
const SESSION_TTL_MS = 15 * 60_000;
/** Размер картинки, в который пережимается загруженный файл. */
const IMAGE_SIZE = 512;
/** Порог localStorage: дальше браузер начинает молча отклонять запись. */
const STORAGE_LIMIT = 4_500_000;

const EFFECT_LABELS: Record<EffectKind, string> = {
  tap: 'Сила клика',
  jackpot: 'Выплата «Бонуса»',
  crit: 'Шанс крита',
  speed: 'Скорость автокликера',
  cooldown: 'Сокращение КД',
  eff: 'Сила улучшений',
  robot: 'Лишний автоклик',
  passive: 'Пассивный доход',
  quality: 'Качество улучшений',
  space: 'Временный ×2',
  experimental: 'Редкие ×5',
  friends: 'Друзья',
};

/** Заглушка для нового завода, пока не загружена своя картинка. */
const PLACEHOLDER_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">'
    + '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
    + '<stop offset="0" stop-color="#3a2400"/><stop offset="1" stop-color="#140d00"/>'
    + '</linearGradient></defs><rect width="512" height="512" rx="96" fill="url(#g)"/>'
    + '<text x="256" y="340" font-size="230" font-family="sans-serif" font-weight="700"'
    + ' fill="#ffb800" text-anchor="middle">?</text></svg>',
)}`;

const lsGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const lsSet = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // хранилище недоступно — вход просто не сохранится
  }
};

const lsDel = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
};

/** Простой хэш ПИНа: не криптография, а чтобы пароль не лежал открытым текстом. */
const hashPin = (pin: string): string => {
  let hash = 5381;
  for (let i = 0; i < pin.length; i += 1) hash = ((hash << 5) + hash + pin.charCodeAt(i)) >>> 0;
  return hash.toString(36);
};

const isSessionActive = (): boolean => Number(lsGet(SESSION_KEY) ?? 0) > Date.now();
const startSession = (): void => lsSet(SESSION_KEY, String(Date.now() + SESSION_TTL_MS));
const endSession = (): void => lsDel(SESSION_KEY);

const currentUsername = (): string => {
  try {
    return initData.user()?.username ?? '';
  } catch {
    return '';
  }
};

/** Одна заводская карточка в форме: числа лежат строками, пока их не сохранишь. */
interface DevEntry {
  id: FactoryId;
  /** Завод из кода: его нельзя удалить, только править. */
  builtin: boolean;
  title: string;
  effect: EffectKind;
  effectText: string;
  /** Цена в токенах — так игрок и думает. */
  costTokens: string;
  /** КД в секундах. */
  cycleSec: string;
  image: string;
  /** Картинка подменена правкой — показываем кнопку «сбросить». */
  imageOverridden: boolean;
}

const entryFromDef = (def: FactoryDef, overridden: boolean): DevEntry => ({
  id: def.id,
  builtin: BUILTIN_FACTORY_IDS.includes(def.id),
  title: def.title,
  effect: def.effect,
  effectText: def.effectText,
  costTokens: String(def.baseCost / MICRO),
  cycleSec: String(def.cycleMs / 1000),
  image: def.image,
  imageOverridden: overridden,
});

const loadEntries = (): DevEntry[] => {
  const patch = readCatalogPatch();
  return FACTORIES.map((def) =>
    entryFromDef(def, patch.overrides[def.id]?.image !== undefined),
  );
};

const inputStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--wc-surface-2)',
  border: '1px solid var(--wc-separator)',
  color: 'var(--wc-text)',
  borderRadius: 10,
  padding: '8px 10px',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'inherit',
  outline: 'none',
};

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--wc-text-3)',
  marginBottom: 4,
};

const Field: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
  <div style={{ flex: 1, minWidth: 130 }}>
    <span style={labelStyle}>{label}</span>
    {children}
  </div>
);

export const DevPanel: FC<DevPanelProps> = ({ onClose, onCatalogChange, friends, onSetFriends }) => {
  const [unlocked, setUnlocked] = useState(isSessionActive);

  // Сессия сгорает сама: панель закрывается даже если открытой её забыли.
  useEffect(() => {
    if (!unlocked) return;
    const id = window.setInterval(() => {
      if (!isSessionActive()) setUnlocked(false);
    }, 10_000);
    return () => window.clearInterval(id);
  }, [unlocked]);

  if (!unlocked) {
    return (
      <LockScreen
        onClose={onClose}
        onSuccess={() => {
          startSession();
          setUnlocked(true);
        }}
      />
    );
  }

  return (
    <Editor
      onClose={onClose}
      onCatalogChange={onCatalogChange}
      friends={friends}
      onSetFriends={onSetFriends}
    />
  );
};

/* ------------------------------- Вход -------------------------------- */

const LockScreen: FC<{ onClose: () => void; onSuccess: () => void }> = ({
  onClose,
  onSuccess,
}) => {
  const owner = lsGet(OWNER_KEY);
  const username = currentUsername();
  const [pin, setPin] = useState('');
  const [pinAgain, setPinAgain] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isSetup = !owner;

  const submit = () => {
    if (pin.length < 4) {
      setError('ПИН должен быть от 4 символов');
      return;
    }

    if (isSetup) {
      if (pin !== pinAgain) {
        setError('ПИНы не совпали');
        return;
      }
      lsSet(OWNER_KEY, username || 'dev');
      lsSet(PIN_KEY, hashPin(pin));
      onSuccess();
      return;
    }

    // Юзернейм обязан совпасть: панель открывается только «своему» аккаунту.
    if (owner !== 'dev' && username && username.toLowerCase() !== owner.toLowerCase()) {
      setError(`Панель привязана к @${owner}, а ты вошёл как @${username}`);
      return;
    }

    if (hashPin(pin) !== lsGet(PIN_KEY)) {
      setError('Неверный ПИН');
      return;
    }

    onSuccess();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(5, 5, 7, 0.97)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--wc-text)' }}>
        {isSetup ? 'Создай ПИН панели' : 'Панель разработчика'}
      </div>

      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--wc-text-2)', lineHeight: 1.4 }}>
        {isSetup ? (
          <>
            Первый вход от @{username || 'dev'}: придумай ПИН, дальше он будет
            спрашиваться каждый раз, а разблокировка живёт 15 минут.
          </>
        ) : owner === 'dev' ? (
          'Введи ПИН, чтобы открыть каталог заводов.'
        ) : (
          <>
            Ты вошёл как @{username || '—'}, панель привязана к @{owner}.
          </>
        )}
      </div>

      <input
        type="password"
        inputMode="numeric"
        placeholder="ПИН"
        value={pin}
        onChange={(e) => {
          setPin(e.target.value);
          setError(null);
        }}
        style={{ ...inputStyle, maxWidth: 240, textAlign: 'center', letterSpacing: 4 }}
      />

      {isSetup && (
        <input
          type="password"
          inputMode="numeric"
          placeholder="Повтори ПИН"
          value={pinAgain}
          onChange={(e) => {
            setPinAgain(e.target.value);
            setError(null);
          }}
          style={{ ...inputStyle, maxWidth: 240, textAlign: 'center', letterSpacing: 4 }}
        />
      )}

      {error && (
        <div style={{ fontSize: 12, fontWeight: 700, color: '#ff6b7a' }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={submit}
          style={{
            ...inputStyle,
            width: 'auto',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #ffe07a, #ffb800, #ff8a00)',
            color: '#1a1200',
            border: '1px solid rgba(255,255,255,0.2)',
            fontWeight: 900,
            padding: '9px 18px',
          }}
        >
          {isSetup ? 'Создать' : 'Войти'}
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{ ...inputStyle, width: 'auto', cursor: 'pointer', padding: '9px 18px' }}
        >
          Отмена
        </button>
      </div>
    </div>
  );
};

/* ------------------------------ Редактор ------------------------------ */

const Editor: FC<{
  onClose: () => void;
  onCatalogChange: () => void;
  friends: number;
  onSetFriends: (count: number) => void;
}> = ({ onClose, onCatalogChange, friends, onSetFriends }) => {
  const [entries, setEntries] = useState(loadEntries);
  // Черновик отдельным состоянием: начисление срабатывает по кнопке, а
  // не на каждый введённый символ — иначе «1», «12», «123» дали бы
  // награду трижды.
  const [friendsDraft, setFriendsDraft] = useState(String(friends));
  const [draftTitle, setDraftTitle] = useState('');
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentSize = JSON.stringify(entries).length;

  const update = (id: FactoryId, patch: Partial<DevEntry>) => {
    setEntries((list) => list.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
    setSaved(null);
  };

  /** Проверяет форму, пишет правку в localStorage и пересобирает каталог. */
  const persist = (next: DevEntry[]): boolean => {
    const patch: CatalogPatch = { overrides: {}, added: [] };

    for (const entry of next) {
      const title = entry.title.trim();
      const cost = Math.round(Number(entry.costTokens.replace(',', '.')) * MICRO);
      const cycle = Math.round(Number(entry.cycleSec.replace(',', '.')) * 1000);

      if (!title) {
        setError(`У завода «${entry.id}» пустое название`);
        return false;
      }
      if (!Number.isFinite(cost) || cost <= 0) {
        setError(`Цена у «${title}» — не число: «${entry.costTokens}»`);
        return false;
      }
      if (!Number.isFinite(cycle) || cycle < 1000) {
        setError(`КД у «${title}» должен быть не меньше секунды`);
        return false;
      }

      const def: FactoryDef = {
        id: entry.id,
        title,
        effect: entry.effect,
        effectText: entry.effectText,
        image: entry.image,
        baseCost: cost,
        cycleMs: cycle,
      };

      if (entry.builtin) patch.overrides[entry.id] = def;
      else patch.added.push(def);
    }

    const size = JSON.stringify(patch).length;
    if (size > STORAGE_LIMIT) {
      setError(
        `Правки весят ${Math.round(size / 1024)} КБ — localStorage не выдержит. ` +
          'Уменьши картинки.',
      );
      return false;
    }

    writeCatalogPatch(patch);
    onCatalogChange();
    setEntries(next);
    setSaved(
      `Сохранено · ${next.length} заводов · ${Math.round(size / 1024)} КБ из 4500`,
    );
    setError(null);
    return true;
  };

  const addFactory = () => {
    const title = draftTitle.trim();
    if (!title) {
      setError('Введи название нового завода');
      return;
    }

    const slug =
      title
        .toLowerCase()
        .replace(/[^a-zа-я0-9]+/gi, '_')
        .replace(/^_+|_+$/g, '') || 'factory';
    const id = entries.some((entry) => entry.id === slug)
      ? `${slug}_${Date.now().toString(36)}`
      : slug;

    const next = [
      ...entries,
      {
        id,
        builtin: false,
        title,
        effect: 'tap' as EffectKind,
        effectText: 'опиши, что даёт улучшение',
        costTokens: '300',
        cycleSec: '60',
        image: PLACEHOLDER_IMAGE,
        imageOverridden: false,
      },
    ];
    if (persist(next)) setDraftTitle('');
  };

  const removeFactory = (entry: DevEntry) => {
    if (!window.confirm(`Удалить завод «${entry.title}»?`)) return;
    persist(entries.filter((item) => item.id !== entry.id));
  };

  const resetImage = (entry: DevEntry) => {
    update(entry.id, {
      image: BUILTIN_IMAGES[entry.id] ?? PLACEHOLDER_IMAGE,
      imageOverridden: false,
    });
    setSaved('Картинка вернулась к исходной — нажми «Сохранить»');
  };

  const pickImage = (entry: DevEntry, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = IMAGE_SIZE;
        canvas.height = IMAGE_SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.imageSmoothingQuality = 'high';
        // Вписываем по меньшей стороне и центрируем — углы остаются
        // прозрачными, как у SVG-заглушек из проекта.
        const scale = Math.min(IMAGE_SIZE / img.width, IMAGE_SIZE / img.height);
        const width = img.width * scale;
        const height = img.height * scale;
        ctx.drawImage(
          img,
          (IMAGE_SIZE - width) / 2,
          (IMAGE_SIZE - height) / 2,
          width,
          height,
        );
        update(entry.id, { image: canvas.toDataURL('image/png'), imageOverridden: true });
        setSaved('Картинка обновлена — не забудь «Сохранить»');
      };
      if (typeof reader.result !== 'string') return;
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const resetAll = () => {
    if (!window.confirm('Сбросить все правки и вернуть три базовых завода?')) return;
    writeCatalogPatch(emptyCatalogPatch());
    onCatalogChange();
    setEntries(loadEntries());
    setSaved('Каталог сброшен к исходным трём заводам');
    setError(null);
  };

  const applyFriends = () => {
    const value = Math.floor(Number(friendsDraft.replace(',', '.')));
    if (!Number.isFinite(value) || value < 0) {
      setError('Друзей — целое число от 0');
      return;
    }
    const delta = value - friends;
    onSetFriends(value);
    setFriendsDraft(String(value));
    setError(null);
    setSaved(
      delta > 0
        ? `Друзей: ${value} · начислено +${formatTokens(delta * FRIEND_REWARD)}`
        : `Друзей: ${value}`,
    );
  };

  const logout = () => {
    endSession();
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'var(--wc-bg)',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        padding: '16px 16px 48px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--wc-text)' }}>
            Панель разработчика
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--wc-text-3)', marginTop: 2 }}>
            Правки видны только на этом устройстве · сессия 15 минут
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{ ...inputStyle, width: 'auto', cursor: 'pointer', padding: '7px 12px' }}
        >
          Закрыть
        </button>
      </div>

      {saved && (
        <div
          style={{
            marginTop: 12,
            padding: '9px 12px',
            borderRadius: 'var(--wc-radius-m)',
            background: 'rgba(46, 230, 107, 0.14)',
            border: '1px solid rgba(46, 230, 107, 0.4)',
            color: '#7dffb0',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {saved}
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: 12,
            padding: '9px 12px',
            borderRadius: 'var(--wc-radius-m)',
            background: 'rgba(255, 79, 96, 0.12)',
            border: '1px solid rgba(255, 79, 96, 0.45)',
            color: '#ff8792',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      )}

      {/* Друзья: пока сервера нет, счётчик задаётся вручную. */}
      <div
        style={{
          marginTop: 14,
          padding: 12,
          background: 'var(--wc-surface)',
          border: '1px solid var(--wc-separator)',
          borderRadius: 'var(--wc-radius-m)',
          display: 'flex',
          gap: 8,
          alignItems: 'flex-end',
          flexWrap: 'wrap',
        }}
      >
        <Field label={`Друзей · +${formatTokens(FRIEND_REWARD)} за нового`}>
          <input
            value={friendsDraft}
            inputMode="numeric"
            onChange={(e) => setFriendsDraft(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <button
          type="button"
          onClick={applyFriends}
          style={{
            ...inputStyle,
            width: 'auto',
            cursor: 'pointer',
            fontWeight: 900,
            color: '#1a1200',
            background: 'linear-gradient(135deg, #ffe07a, #ffb800, #ff8a00)',
            border: '1px solid rgba(255,255,255,0.2)',
            padding: '0 16px',
          }}
        >
          Применить
        </button>
      </div>

      {/* Новый завод */}
      <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
        <input
          placeholder="Название нового завода, например 🛸 Космопорт"
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          type="button"
          onClick={addFactory}
          style={{
            ...inputStyle,
            width: 'auto',
            cursor: 'pointer',
            fontWeight: 900,
            color: '#1a1200',
            background: 'linear-gradient(135deg, #ffe07a, #ffb800, #ff8a00)',
            border: '1px solid rgba(255,255,255,0.2)',
            padding: '0 16px',
          }}
        >
          + Добавить
        </button>
      </div>

      {/* Список заводов */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
        {entries.map((entry) => (
          <div
            key={entry.id}
            style={{
              background: 'var(--wc-surface)',
              border: '1px solid var(--wc-separator)',
              borderRadius: 'var(--wc-radius-m)',
              padding: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img
                src={entry.image}
                alt=""
                style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: 'var(--wc-text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {entry.title}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--wc-text-3)' }}>
                  id: {entry.id} · {entry.builtin ? 'из кода' : 'добавлен'}
                </div>
              </div>
              {!entry.builtin && (
                <button
                  type="button"
                  onClick={() => removeFactory(entry)}
                  style={{
                    ...inputStyle,
                    width: 'auto',
                    cursor: 'pointer',
                    color: '#ff8792',
                    borderColor: 'rgba(255, 79, 96, 0.5)',
                    padding: '6px 10px',
                    fontSize: 12,
                  }}
                >
                  Удалить
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <Field label="Название">
                <input
                  value={entry.title}
                  onChange={(e) => update(entry.id, { title: e.target.value })}
                  style={inputStyle}
                />
              </Field>
              <Field label="Подпись эффекта">
                <input
                  value={entry.effectText}
                  onChange={(e) => update(entry.id, { effectText: e.target.value })}
                  style={inputStyle}
                />
              </Field>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <Field label="Что качает">
                <select
                  value={entry.effect}
                  onChange={(e) => update(entry.id, { effect: e.target.value as EffectKind })}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {(Object.keys(EFFECT_LABELS) as EffectKind[])
                    .filter((kind) => kind !== 'friends')
                    .map((kind) => (
                    <option key={kind} value={kind}>
                      {EFFECT_LABELS[kind]}
                    </option>
                    ))}
                </select>
              </Field>
              <Field label="Цена, токенов">
                <input
                  value={entry.costTokens}
                  inputMode="decimal"
                  onChange={(e) => update(entry.id, { costTokens: e.target.value })}
                  style={inputStyle}
                />
              </Field>
              <Field label="КД, сек">
                <input
                  value={entry.cycleSec}
                  inputMode="decimal"
                  onChange={(e) => update(entry.id, { cycleSec: e.target.value })}
                  style={inputStyle}
                />
              </Field>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
              <label
                style={{
                  ...inputStyle,
                  width: 'auto',
                  cursor: 'pointer',
                  textAlign: 'center',
                  padding: '7px 12px',
                  fontSize: 12,
                }}
              >
                Картинка…
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) pickImage(entry, file);
                    e.target.value = '';
                  }}
                />
              </label>
              {entry.builtin && entry.imageOverridden && (
                <button
                  type="button"
                  onClick={() => resetImage(entry)}
                  style={{
                    ...inputStyle,
                    width: 'auto',
                    cursor: 'pointer',
                    padding: '7px 12px',
                    fontSize: 12,
                  }}
                >
                  Сбросить картинку
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Сохранение */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button
          type="button"
          onClick={() => persist(entries)}
          style={{
            ...inputStyle,
            flex: 1,
            cursor: 'pointer',
            fontWeight: 900,
            color: '#1a1200',
            background: 'linear-gradient(135deg, #ffe07a, #ffb800, #ff8a00)',
            border: '1px solid rgba(255,255,255,0.2)',
            padding: '11px',
            fontSize: 14,
          }}
        >
          Сохранить
        </button>
        <button
          type="button"
          onClick={resetAll}
          style={{
            ...inputStyle,
            cursor: 'pointer',
            color: '#ff8792',
            borderColor: 'rgba(255, 79, 96, 0.5)',
            padding: '11px 14px',
            fontSize: 13,
          }}
        >
          Сбросить всё
        </button>
        <button
          type="button"
          onClick={logout}
          style={{ ...inputStyle, width: 'auto', cursor: 'pointer', padding: '11px 14px', fontSize: 13 }}
        >
          Выйти
        </button>
      </div>

      <div
        style={{
          marginTop: 12,
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--wc-text-3)',
          lineHeight: 1.5,
        }}
      >
        Правки лежат в localStorage и не уходят игрокам: чтобы завод появился у всех,
        его нужно зашить в код и задеплоить. Форма сейчас: {Math.round(currentSize / 1024)} КБ.
      </div>
    </div>
  );
};
