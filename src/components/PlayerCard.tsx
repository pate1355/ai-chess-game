import React from 'react';

interface PlayerCardProps {
  color: 'white' | 'black';
  modelName: string;
  isThinking: boolean;
  isActive: boolean;
  capturedPieces: string[];
  result: 'win' | 'loss' | 'draw' | null;
}

const PIECE_SYMBOLS: Record<string, string> = {
  p: '♟',
  n: '♞',
  b: '♝',
  r: '♜',
  q: '♛',
  k: '♚',
};

// Piece values for sorting captured pieces
const PIECE_ORDER: Record<string, number> = {
  q: 0,
  r: 1,
  b: 2,
  n: 3,
  p: 4,
  k: 5,
};

function getDisplayName(modelId: string): string {
  // Shorten model names for display
  const parts = modelId.split('/');
  const name = parts[parts.length - 1];
  return name.length > 28 ? name.slice(0, 26) + '…' : name;
}

const PlayerCard: React.FC<PlayerCardProps> = ({
  color,
  modelName,
  isThinking,
  isActive,
  capturedPieces,
  result,
}) => {
  const sortedCaptured = [...capturedPieces].sort(
    (a, b) => (PIECE_ORDER[a] ?? 9) - (PIECE_ORDER[b] ?? 9)
  );

  const cardClass = [
    'player-card',
    'glass-card',
    isActive && !result ? 'active' : '',
    result === 'win' ? 'winner' : '',
    result === 'loss' ? 'loser' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cardClass}>
      <div className="player-header">
        <div className={`player-color-badge ${color}`}>
          {color === 'white' ? '♔' : '♚'}
        </div>
        <div className="player-info">
          <div className="player-label">{color}</div>
          <div className="player-model-name" title={modelName}>
            {getDisplayName(modelName)}
          </div>
        </div>
      </div>

      {isThinking && (
        <div className="thinking-indicator">
          <div className="thinking-dots">
            <span />
            <span />
            <span />
          </div>
          Thinking…
        </div>
      )}

      {result && (
        <div
          className={`result-badge ${result === 'draw' ? 'draw-badge' : result}`}
        >
          {result === 'win' && '👑 Winner'}
          {result === 'loss' && '✗ Defeated'}
          {result === 'draw' && '🤝 Draw'}
        </div>
      )}

      <div className="captured-pieces">
        <div className="captured-label">Captured</div>
        <div className="captured-list">
          {sortedCaptured.length === 0 ? (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              —
            </span>
          ) : (
            sortedCaptured.map((piece, i) => (
              <span key={i}>{PIECE_SYMBOLS[piece] ?? piece}</span>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerCard;
