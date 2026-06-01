import React, { useMemo } from 'react';
import { Chessboard } from 'react-chessboard';

interface ChessBoardProps {
  fen: string;
  lastMove: { from: string; to: string } | null;
  isCheck: boolean;
  turn: 'w' | 'b';
}

const ChessBoardWrapper: React.FC<ChessBoardProps> = ({
  fen,
  lastMove,
  isCheck,
  turn,
}) => {
  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    // Highlight last move squares
    if (lastMove) {
      styles[lastMove.from] = {
        background: 'rgba(139, 92, 246, 0.3)',
      };
      styles[lastMove.to] = {
        background: 'rgba(139, 92, 246, 0.5)',
      };
    }

    // Highlight king if in check
    if (isCheck) {
      const kingChar = turn === 'w' ? 'K' : 'k';
      const fenBoard = fen.split(' ')[0];
      const ranks = fenBoard.split('/');
      for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
        let fileIdx = 0;
        for (const ch of ranks[rankIdx]) {
          if (ch >= '1' && ch <= '8') {
            fileIdx += parseInt(ch);
          } else {
            if (ch === kingChar) {
              const sq = String.fromCharCode(97 + fileIdx) + (8 - rankIdx);
              styles[sq] = {
                background:
                  'radial-gradient(circle, rgba(239,68,68,0.8) 0%, rgba(239,68,68,0.3) 60%, transparent 80%)',
              };
            }
            fileIdx++;
          }
        }
      }
    }

    return styles;
  }, [lastMove, isCheck, fen, turn]);

  return (
    <div className="board-container glass-card" style={{ width: '520px', maxWidth: '100%' }}>
      <Chessboard
        options={{
          position: fen,
          animationDurationInMs: 350,
          allowDragging: false,
          boardStyle: {
            borderRadius: '10px',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          },
          darkSquareStyle: { backgroundColor: '#4a4a7a' },
          lightSquareStyle: { backgroundColor: '#9090b8' },
          squareStyles: customSquareStyles,
        }}
      />
    </div>
  );
};

export default ChessBoardWrapper;
