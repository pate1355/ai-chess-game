import React, { useEffect, useRef } from 'react';

interface MoveHistoryProps {
  moves: string[];
}

const MoveHistory: React.FC<MoveHistoryProps> = ({ moves }) => {
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new moves arrive
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [moves.length]);

  // Group moves into pairs (white, black)
  const rows: { number: number; white: string; black?: string }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({
      number: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1],
    });
  }

  function getMoveClass(san: string, isWhite: boolean): string {
    const classes = ['move-san'];
    classes.push(isWhite ? 'white-move' : 'black-move');

    if (san.includes('#')) {
      classes.push('checkmate-move');
    } else if (san.includes('+')) {
      classes.push('check');
    } else if (san.includes('x')) {
      classes.push('capture');
    }

    return classes.join(' ');
  }

  const totalMoves = moves.length;

  return (
    <div className="move-history-card glass-card">
      <div className="move-history-header">
        <h3>📋 Move History</h3>
        <span className="move-count-badge">{totalMoves} moves</span>
      </div>

      {rows.length === 0 ? (
        <div className="move-list-empty">
          Waiting for first move…
        </div>
      ) : (
        <div className="move-list" ref={listRef}>
          {rows.map((row, idx) => {
            const isLatest = idx === rows.length - 1;
            return (
              <div
                key={row.number}
                className={`move-row ${isLatest ? 'latest' : ''}`}
              >
                <span className="move-number">{row.number}.</span>
                <span className={getMoveClass(row.white, true)}>
                  {row.white}
                </span>
                {row.black ? (
                  <span className={getMoveClass(row.black, false)}>
                    {row.black}
                  </span>
                ) : (
                  <span />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MoveHistory;
