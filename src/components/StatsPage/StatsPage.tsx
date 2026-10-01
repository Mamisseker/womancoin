import type { FC } from 'react';

import { GenderBar } from '@/components/GenderBar/GenderBar.tsx';
import { UpgradesSection } from '@/components/UpgradesSection/UpgradesSection.tsx';
import type { UpgradeId } from '@/hooks/useProgress.ts';

interface StatsPageProps {
  coins: number;
  levels: Record<UpgradeId, number>;
  upgradeCost: (id: UpgradeId) => number;
  buyUpgrade: (id: UpgradeId) => boolean;
}

/**
 * Страница «Статистика»: соотношение мужчин и женщин по аудитории
 * (демо-источник, позже реальный сервер) и прокачки игрока.
 *
 * Прокачки переехали сюда с вкладки «Тап», где место заняли бусты:
 * монет на тап всё равно тратится только здесь.
 */
export const StatsPage: FC<StatsPageProps> = ({ coins, levels, upgradeCost, buyUpgrade }) => {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 28,
        paddingTop: 32,
        paddingLeft: 24,
        paddingRight: 24,
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 40, lineHeight: 1 }}>📊</div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: 'var(--wc-text)',
            letterSpacing: -0.5,
          }}
        >
          Статистика
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--wc-text-2)',
            maxWidth: 280,
            lineHeight: 1.45,
          }}
        >
          Усиления и статистика аудитории
        </div>
      </div>

      <div
        style={{
          alignSelf: 'stretch',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        <UpgradesSection
          coins={coins}
          levels={levels}
          upgradeCost={upgradeCost}
          buyUpgrade={buyUpgrade}
        />

        <GenderBar />
      </div>
    </div>
  );
};