import { AppRoot } from '@telegram-apps/telegram-ui';
import { hapticFeedback } from '@tma.js/sdk-react';
import { useEffect, useState, type FC } from 'react';

import { BottomNav } from '@/components/BottomNav/BottomNav.tsx';
import { FactoryPage } from '@/components/FactoryPage/FactoryPage.tsx';
import { FriendsPage } from '@/components/FriendsPage/FriendsPage.tsx';
import { GenderSelect } from '@/components/GenderSelect/GenderSelect.tsx';
import { StatsPage } from '@/components/StatsPage/StatsPage.tsx';
import { TapButton } from '@/components/TapButton/TapButton.tsx';
import { TopBar } from '@/components/TopBar/TopBar.tsx';
import { UpgradesSection } from '@/components/UpgradesSection/UpgradesSection.tsx';
import { WalletPage } from '@/components/WalletPage/WalletPage.tsx';
import { useGender } from '@/hooks/useGender.ts';
import { useProgress } from '@/hooks/useProgress.ts';
import { useReferral } from '@/hooks/useReferral.ts';
import { getLevelInfo } from '@/lib/levels.ts';
import { formatTapGain, formatTokens } from '@/lib/units.ts';

const ENERGY_PER_TAP = 1;

export const App: FC = () => {
  

  const { coins, energy, tap, addCoins, levels, coinsPerTap, maxEnergy, upgradeCost, buyUpgrade } =
    useProgress();
  const { gender, setGender, ready } = useGender();
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

  const handleTap = () => {
    if (energy < ENERGY_PER_TAP) return;
    tap();
    try {
      hapticFeedback.impactOccurred('light');
    } catch {
      // хептика недоступна вне Telegram — игнорируем
    }
  };

  const { level, progress } = getLevelInfo(coins);
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
          paddingBottom: 130,
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

        <TopBar level={level} progress={progress} />

        {tab === 'tap' && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 36,
              paddingTop: 8,
              position: 'relative',
              zIndex: 1,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
            }}
          >
            {/* Баланс — крупный title на фоне */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 700,
                  lineHeight: 1,
                  color: 'var(--wc-text)',
                  letterSpacing: -0.6,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatTokens(coins)}
              </div>
            </div>

            {/* Энергия — шкала заряда от 100% до 0 */}
            <div
              style={{
                alignSelf: 'stretch',
                display: 'flex',
                flexDirection: 'column',
                gap: 7,
                marginTop: -14,
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
                  height: 12,
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

            <TapButton gender={gender} onTap={handleTap} disabled={energy < ENERGY_PER_TAP} />

            <UpgradesSection
              coins={coins}
              levels={levels}
              upgradeCost={upgradeCost}
              buyUpgrade={buyUpgrade}
            />
          </div>
        )}

        {tab === 'stats' && (
          <StatsPage />
        )}

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