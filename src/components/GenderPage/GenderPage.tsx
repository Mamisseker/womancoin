import { useEffect, useState, type CSSProperties, type FC } from 'react';

import { GenderBar } from '@/components/GenderBar/GenderBar.tsx';
import type { Gender } from '@/hooks/useGender';
import { useLeaderboard, type LeaderEntry } from '@/hooks/useLeaderboard';

interface GenderPageProps {
  playerGender: Gender;
  coins: number;
}

const MALE = '#4f8ef7';
const FEMALE = '#ff5fa2';

const rankMedal = (rank: number): string | null => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return null;
};

const rowStyle = (isYou: boolean, accent: string): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 14px',
  borderRadius: 16,
  background: isYou ? `${accent}22` : 'var(--wc-surface)',
  border: isYou ? `1px solid ${accent}66` : '1px solid var(--wc-separator)',
  boxShadow: 'var(--wc-shadow-1)',
});

const LeaderRow: FC<{ entry: LeaderEntry; rank: number; accent: string }> = ({
  entry,
  rank,
  accent,
}) => {
  const medal = rankMedal(rank);

  return (
    <div style={rowStyle(Boolean(entry.isYou), accent)}>
      <div
        style={{
          width: 28,
          textAlign: 'center',
          fontSize: medal ? 18 : 13,
          fontWeight: 800,
          color: 'var(--wc-text-2)',
          fontVariantNumeric: 'tabular-nums',
          flexShrink: 0,
        }}
      >
        {medal ?? rank}
      </div>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          background: `${accent}33`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          flexShrink: 0,
        }}
      >
        {accent === MALE ? '👨' : '👩'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--wc-text)',
          }}
        >
          {entry.name}
          {entry.isYou ? (
            <span
              style={{
                marginLeft: 8,
                fontSize: 11,
                fontWeight: 700,
                color: accent,
                letterSpacing: 0.3,
                textTransform: 'uppercase',
              }}
            >
              ты
            </span>
          ) : null}
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--wc-text-3)',
            marginTop: 2,
          }}
        >
          прокачка
        </div>
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 800,
          color: 'var(--wc-text)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: -0.4,
        }}
      >
        {entry.power.toLocaleString('ru-RU')}
      </div>
    </div>
  );
};

const Segment: FC<{
  active: boolean;
  accent: string;
  label: string;
  onClick: () => void;
}> = ({ active, accent, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      flex: 1,
      border: 0,
      borderRadius: 14,
      padding: '10px 8px',
      cursor: 'pointer',
      fontSize: 14,
      fontWeight: 700,
      background: active ? accent : 'transparent',
      color: active ? '#fff' : 'var(--wc-text-2)',
      transition: 'background 0.15s ease, color 0.15s ease',
      WebkitTapHighlightColor: 'transparent',
    }}
  >
    {label}
  </button>
);

export const GenderPage: FC<GenderPageProps> = ({ playerGender, coins }) => {
  const [board, setBoard] = useState<Gender>(playerGender);
  const leaders = useLeaderboard(
    board,
    board === playerGender ? coins : null,
  );
  const accent = board === 'male' ? MALE : FEMALE;

  useEffect(() => {
    setBoard(playerGender);
  }, [playerGender]);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: 440,
        alignSelf: 'center',
        padding: '8px 16px 0',
      }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: 'var(--wc-text)',
          letterSpacing: -0.4,
          marginBottom: 4,
        }}
      >
        Лиги
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--wc-text-2)',
          lineHeight: 1.4,
          marginBottom: 16,
        }}
      >
        Свои таблицы у мужчин и женщин. Прокачка пока образная — механика ещё
        не готова.
      </div>

      <GenderBar />

      <div
        style={{
          display: 'flex',
          gap: 4,
          marginTop: 20,
          marginBottom: 12,
          padding: 4,
          borderRadius: 16,
          background: 'var(--wc-surface-2)',
        }}
      >
        <Segment
          active={board === 'male'}
          accent={MALE}
          label="👨 Мужчины"
          onClick={() => setBoard('male')}
        />
        <Segment
          active={board === 'female'}
          accent={FEMALE}
          label="👩 Женщины"
          onClick={() => setBoard('female')}
        />
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          paddingBottom: 8,
        }}
      >
        {leaders.map((entry, i) => (
          <LeaderRow
            key={entry.id}
            entry={entry}
            rank={i + 1}
            accent={accent}
          />
        ))}
      </div>
    </div>
  );
};
