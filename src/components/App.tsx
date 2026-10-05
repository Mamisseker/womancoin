import { AppRoot } from '@telegram-apps/telegram-ui';
import { hapticFeedback } from '@tma.js/sdk-react';
import { useCallback, useEffect, useState, type FC } from 'react';

import { BottomNav } from '@/components/BottomNav/BottomNav.tsx';
import { FactoryPage } from '@/components/FactoryPage/FactoryPage.tsx';
import { FriendsPage } from '@/components/FriendsPage/FriendsPage.tsx';
import { GenderSelect } from '@/components/GenderSelect/GenderSelect.tsx';
import { StatsPage } from '@/components/StatsPage/StatsPage.tsx';
import { TapButton } from '@/components/TapButton/TapButton.tsx';

import { WalletPage } from '@/components/WalletPage/WalletPage.tsx';
import { useGender } from '@/hooks/useGender.ts';
import { useProgress } from '@/hooks/useProgress.ts';
import { useReferral } from '@/hooks/useReferral.ts';
import { formatTapGain, formatTokens } from '@/lib/units.ts';
import { BoostsPanel } from '@/components/BoostsPanel/BoostsPanel.tsx';
import type { BoostId } from '@/lib/boosts.ts';
import { useBoosts } from '@/hooks/useBoosts.ts';

const ENERGY_PER_TAP = 1;

// Резерв под фиксированную нижнюю навигацию. Он же компенсируется
// на вкладке «Тап», чтобы блок монеты центрировался по экрану,
// а не по области над навигацией.
const NAV_RESERVE = 130;

export const App: FC = () => {
  

  const { gender, setGender, ready } = useGender();
  const { states: boostStates, now: boostNow, activate, isWorking } = useBoosts();
  const { coins, energy, tap, addCoins, coinsPerTap, maxEnergy, claimJackpot } =
    useProgress({ turboTap: isWorking('turboTap'), regen: isWorking('regen') });
  const { referralLink, invitedBy, bonus, claimBonus, usingTelegram, demoStats } =
    useReferral();
  const [tab, setTab] = useState('tap');

  useEffect(() => {
    // Тёмная оранжевая тема зафиксирована: дизайн не зависит от темы Telegram.
    document.documentElement.dataset.theme = 'dark';
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
    if (energy < ENERGY_PER_TAP) return;
    tap();
    try {
      hapticFeedback.impactOccurred('light');
    } catch {
      // хептика недоступна вне Telegram — игнорируем
    }
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
              overscrollBehavior: 'contain',
            }}
          >
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
                />
              </div>
            </div>
          </div>
        )}

        {tab === 'stats' && <StatsPage />}

        {tab === 'boost' && (
          <FactoryPage tapLevel={coinsPerTap - 1} />
        )}

        {tab === 'friends' && (
          <FriendsPage
            referralLink={referralLink}
            usingTelegram={usingTelegram}
            invitedBy={invitedBy}
            demoStats={demoStats}
          />
        )}

        {tab === 'wallet' && (
          <WalletPage />
        )}

        <BottomNav active={tab} onChange={setTab} />
      </div>
    </AppRoot>
  );
};