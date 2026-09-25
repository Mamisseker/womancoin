import { AppRoot } from '@telegram-apps/telegram-ui';
import { useSignal, miniApp, hapticFeedback } from '@tma.js/sdk-react';
import { useEffect, useState, type FC } from 'react';

import { BottomNav } from '@/components/BottomNav/BottomNav.tsx';
import { FriendsPage } from '@/components/FriendsPage/FriendsPage.tsx';
import { GenderSelect } from '@/components/GenderSelect/GenderSelect.tsx';
import { Placeholder } from '@/components/Placeholder/Placeholder.tsx';
import { StatsPage } from '@/components/StatsPage/StatsPage.tsx';
import { TapButton } from '@/components/TapButton/TapButton.tsx';
import { TopBar } from '@/components/TopBar/TopBar.tsx';
import { UpgradesSection } from '@/components/UpgradesSection/UpgradesSection.tsx';
import { WalletPage } from '@/components/WalletPage/WalletPage.tsx';
import { useGender } from '@/hooks/useGender.ts';
import { useProgress } from '@/hooks/useProgress.ts';
import { useReferral } from '@/hooks/useReferral.ts';

const ENERGY_PER_TAP = 1;

export const App: FC = () => {
  const isDark = useSignal(miniApp.isDark);

  const { coins, energy, tap, addCoins, levels, coinsPerTap, maxEnergy, upgradeCost, buyUpgrade } =
    useProgress();
  const { gender, setGender, ready } = useGender();
  const { referralLink, invitedBy, bonus, claimBonus, usingTelegram, demoStats } =
    useReferral();
  const [tab, setTab] = useState('tap');

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  }, [isDark]);

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

  const level = Math.floor(coins / 100) + 1;
  const progress = ((coins % 100) / 100) * 100;

  if (!ready) {
    return null;
  }

  if (!gender) {
    return <GenderSelect onSelect={setGender} />;
  }

  return (
    <AppRoot appearance={isDark ? 'dark' : 'light'}>
      <div
        style={{
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--wc-bg)',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 130,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
        }}
      >
        {/* Лёгкое ambient-свечение за кнопкой */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 420,
            height: 420,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, var(--wc-glow) 0%, transparent 65%)',
            pointerEvents: 'none',
            filter: 'blur(24px)',
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
                  fontSize: 56,
                  fontWeight: 700,
                  lineHeight: 1,
                  color: 'var(--wc-text)',
                  letterSpacing: -1.5,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {coins.toLocaleString('ru-RU')}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--wc-text-2)',
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                }}
              >
                Woman Coins
              </div>
            </div>

            {/* Энергия — компактный чип под балансом */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--wc-text-2)',
                background: 'var(--wc-surface-2)',
                padding: '9px 18px',
                borderRadius: 100,
                marginTop: -14,
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 14 }}>⚡</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                {energy}/{maxEnergy}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--wc-text-3)',
                }}
              >
                · +{coinsPerTap}/тап
              </span>
            </div>

            <TapButton onTap={handleTap} disabled={energy < ENERGY_PER_TAP} />

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
          <Placeholder
            icon="⚡"
            title="Буст"
            text="Усилители тапа: x2 к награде, автопап, полное восстановление энергии."
          />
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
          <WalletPage coins={coins} addCoins={addCoins} />
        )}

        <BottomNav active={tab} onChange={setTab} />
      </div>
    </AppRoot>
  );
};