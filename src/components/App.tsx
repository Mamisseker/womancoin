import { AppRoot } from '@telegram-apps/telegram-ui';
import { hapticFeedback } from '@tma.js/sdk-react';
import { useCallback, useEffect, useRef, useState, type FC } from 'react';

import { BottomNav } from '@/components/BottomNav/BottomNav.tsx';
import { FactoryPage } from '@/components/FactoryPage/FactoryPage.tsx';
import { useAutoclicker } from '@/hooks/useAutoclicker.ts';
import { useFactories } from '@/hooks/useFactories.ts';
import { GenderSelect } from '@/components/GenderSelect/GenderSelect.tsx';
import { StatsPage } from '@/components/StatsPage/StatsPage.tsx';
import { TapButton } from '@/components/TapButton/TapButton.tsx';

import { WalletPage } from '@/components/WalletPage/WalletPage.tsx';
import { useGender } from '@/hooks/useGender.ts';
import { useProgress } from '@/hooks/useProgress.ts';
import { useReferral } from '@/hooks/useReferral.ts';
import { formatTapGain, formatTokens } from '@/lib/units.ts';
import { BoostsPanel } from '@/components/BoostsPanel/BoostsPanel.tsx';
import { getJackpotMicro, type BoostId } from '@/lib/boosts.ts';
import { useBoosts } from '@/hooks/useBoosts.ts';

const ENERGY_PER_TAP = 1;

// Резерв под фиксированную нижнюю навигацию. Он же компенсируется
// на вкладке «Тап», чтобы блок монеты центрировался по экрану,
// а не по области над навигацией.
const NAV_RESERVE = 130;

export const App: FC = () => {
  

  const { gender, setGender, ready } = useGender();
  const { states: boostStates, now: boostNow, activate, isWorking } = useBoosts();

  // Заводы вызывают списание и зачисление ещё ДО создания useProgress,
  // поэтому держим их через ref: к моменту первой покупки или загрузки
  // он уже заполнен, а порядок хуков остаётся стабильным.
  const actionsRef = useRef<{ spend: (n: number) => boolean; add: (n: number) => void }>({
    spend: () => false,
    add: () => undefined,
  });

  const factories = useFactories(
    (amount) => actionsRef.current.spend(amount),
    (amount) => actionsRef.current.add(amount),
  );

  const { coins, energy, tap, addCoins, spendCoins, coinsPerTap, maxEnergy, claimJackpot } =
    useProgress(
      { turboTap: isWorking('turboTap'), regen: isWorking('regen') },
      factories.bonuses,
    );

  actionsRef.current = { spend: spendCoins, add: addCoins };

  const { ratePerHour: factoryRatePerHour } = useAutoclicker(
    factories.bonuses,
    coinsPerTap,
    addCoins,
  );
  const { bonus, claimBonus, referralLink } = useReferral();
  const [tab, setTab] = useState('tap');
  // Статистика живёт оверлеем из «Тапа» — отдельная вкладка убрана.
  const [statsOpen, setStatsOpen] = useState(false);

  useEffect(() => {
    // Тёмная оранжевая тема зафиксирована: дизайн не зависит от темы Telegram.
    document.documentElement.dataset.theme = 'dark';
  }, []);

  useEffect(() => {
    // Пытаемся зафиксировать портрет средствами браузера. Без fullscreen
    // большинство WebView отказывает, поэтому отказ глушим: надёжная
    // страховка — CSS-заглушка .wc-rotate-guard внизу разметки.
    try {
      // В lib.dom этого TS метода ещё нет, хотя браузеры его знают.
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (value: 'portrait') => Promise<void>;
      };
      void orientation.lock?.('portrait')?.catch(() => undefined);
    } catch {
      // Screen Orientation API недоступен — остаётся заглушка.
    }
  }, []);

  // Разовый бонус приглашённому по реферальной ссылке.
  useEffect(() => {
    if (bonus > 0) {
      const amount = claimBonus();
      if (amount > 0) {
        addCoins(amount);
      }
    }
  }, [bonus, claimBonus, addCoins]);

  // Текущая выплата «Бонуса» — в подписи кнопки, чтобы игрок видел,
  // сколько даёт бонусный завод, а не зачитывал множитель.
  const jackpotPayoutMicro = getJackpotMicro(factories.bonuses.jackpotMult);

  const handleActivateBoost = useCallback((id: BoostId) => {
    try {
      hapticFeedback.impactOccurred('medium');
    } catch {
      // хептика недоступна вне Telegram — игнорируем
    }
    activate(id);
    // «Бонус» выплачивается сразу, остальные влияют через множители.
    if (id === 'jackpot') claimJackpot();
  }, [activate, claimJackpot]);

  const handleTap = () => {
    if (energy < ENERGY_PER_TAP) return null;
    const { amount, crit } = tap();
    try {
      // Критический клик отзывается заметнее обычного — иначе множитель
      // невозможно почувствовать и он выглядит как «ничего не произошло».
      if (crit) hapticFeedback.notificationOccurred('success');
      else hapticFeedback.impactOccurred('light');
    } catch {
      // хептика недоступна вне Telegram — игнорируем
    }
    // Сумма отсюда уходит в плашку, которая вылетает при крите.
    return { amount, crit };
  };

  // Заряд энергии в процентах — для шкалы под кнопкой.
  const energyPercent =
    maxEnergy > 0 ? Math.min(100, Math.max(0, (energy / maxEnergy) * 100)) : 0;

  if (!ready) {
    return null;
  }

  if (!gender) {
    return <GenderSelect onSelect={setGender} />;
  }

  return (
    <AppRoot appearance="dark">
      <div
        style={{
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          background:
            'radial-gradient(120% 90% at 50% -10%, rgba(255,184,0,0.12) 0%, transparent 55%), radial-gradient(100% 80% at 90% 110%, rgba(255,138,0,0.1) 0%, transparent 55%), var(--wc-bg)',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: NAV_RESERVE,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
        }}
      >
        {/* Неоновое ambient-свечение за кнопкой */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 460,
            height: 460,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, var(--wc-glow) 0%, transparent 68%)',
            pointerEvents: 'none',
            filter: 'blur(28px)',
          }}
        />

        {tab === 'tap' && (
          <div
            style={{
              flex: 1,
              // Обязательно flex: без него внутренний блок — обычный
              // бокс, и auto-отступы по вертикали схлопываются в ноль.
              display: 'flex',
              flexDirection: 'column',
              // Забираем резерв навигации обратно: иначе флекс-контейнер
              // на 130 px короче экрана и блок центрируется выше центра.
              marginBottom: -NAV_RESERVE,
              position: 'relative',
              zIndex: 1,
              overflowY: 'auto',
              // Без явного overflowX браузер считает его auto (так велит
              // CSS при overflow-y: auto), и вылетающие частицы создают
              // горизонтальную прокрутку — экран можно смахнуть вбок.
              overflowX: 'hidden',
              // Жест оставляем только вертикальный: горизонтальные смахивания
              // не должны ни прокручивать, ни уводить страницу.
              touchAction: 'pan-y',
              overscrollBehavior: 'contain',
            }}
          >
            {/* Кнопка статистики в левом верхнем углу экрана. */}
            <button
              type="button"
              aria-label="Статистика"
              onClick={() => setStatsOpen(true)}
              style={{
                position: 'absolute',
                top: 8,
                left: 12,
                width: 38,
                height: 38,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                lineHeight: 1,
                background: 'var(--wc-surface)',
                border: '1px solid var(--wc-separator)',
                color: 'var(--wc-text-2)',
                boxShadow: 'var(--wc-shadow-1)',
                cursor: 'pointer',
                zIndex: 2,
              }}
            >
              📊
            </button>

            {/* Шкала энергии закреплена у верхнего края и вынесена из
                центрируемого блока: иначе она сдвинула бы круг монеты
                вниз от геометрического центра экрана. */}
            <div
              style={{
                position: 'absolute',
                top: 8,
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  // Не растягиваем на всю ширину: полоса компактная,
                  // толще прежней — так заряд энергии заметнее.
                  width: 220,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 7,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--wc-text-2)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 13 }}>⚡</span>
                    <span>Энергия</span>
                  </span>
                  <span style={{ color: 'var(--wc-text-3)' }}>
                    {formatTapGain(coinsPerTap)}
                  </span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: 18,
                    borderRadius: 100,
                    background: 'var(--wc-surface-2)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${energyPercent}%`,
                      height: '100%',
                      borderRadius: 100,
                      background: 'linear-gradient(90deg, var(--wc-accent), var(--wc-accent-2))',
                      transition: 'width 0.25s ease',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Круг монеты с бустами центрируется по вертикали через auto-отступы,
                а не justifyContent: 'center'. При нехватке места auto-отступы
                схлопываются в ноль и контент остаётся доступным прокруткой,
                тогда как justify-content обрезал бы верх экрана. */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                margin: 'auto 0',
                paddingBottom: 24,
              }}
            >
              {/* Монета с бустами справа; баланс остаётся под монетой,
                  поэтому левая колонка шириной ровно в кнопку. */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  gap: 8,
                  paddingLeft: 6,
                  paddingRight: 6,
                  boxSizing: 'border-box',
                  alignSelf: 'stretch',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    flexShrink: 0,
                  }}
                >
                  <TapButton
                    gender={gender}
                    onTap={handleTap}
                    disabled={energy < ENERGY_PER_TAP}
                  />

                  <div
                    style={{
                      fontSize: 34,
                      fontWeight: 700,
                      lineHeight: 1,
                      color: 'var(--wc-text)',
                      letterSpacing: -0.8,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatTokens(coins)}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--wc-text-3)',
                      letterSpacing: 2,
                      textTransform: 'uppercase',
                    }}
                  >
                    Woman Coins
                  </div>
                </div>

                <BoostsPanel
                  states={boostStates}
                  now={boostNow}
                  onActivate={handleActivateBoost}
                  details={{ jackpot: `+${formatTokens(jackpotPayoutMicro)}` }}
                />
              </div>
            </div>
          </div>
        )}

        {tab === 'boost' && (
          <FactoryPage
            coins={coins}
            bonuses={factories.bonuses}
            ratePerHour={factoryRatePerHour}
            buy={factories.buy}
            collect={factories.collect}
            progressOf={factories.progressOf}
            friends={factories.friends}
            setFriends={factories.setFriends}
            referralLink={referralLink}
          />
        )}

        {tab === 'tap' && statsOpen && <StatsPage onClose={() => setStatsOpen(false)} />}

        {tab === 'wallet' && (
          <WalletPage />
        )}

        <BottomNav active={tab} onChange={setTab} />

        {/* Альбомная ориентация: играть нельзя, пока телефон повёрнут. */}
        <div className="wc-rotate-guard">
          <div style={{ fontSize: 44, lineHeight: 1 }}>📱</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--wc-text)' }}>
            Поверните телефон
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--wc-text-2)', maxWidth: 260 }}>
            Игра работает только в вертикальном режиме
          </div>
        </div>
      </div>
    </AppRoot>
  );
};