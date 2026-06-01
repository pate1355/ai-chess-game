import { useState, useRef, useCallback, useEffect } from 'react';
import { Chess } from 'chess.js';
import type { Chess as ChessType } from 'chess.js';
import { getAIMove } from '../services/chessAI';

export type GameStatus =
  | 'idle'
  | 'playing'
  | 'paused'
  | 'checkmate'
  | 'stalemate'
  | 'draw'
  | 'forfeit';

export interface GameState {
  fen: string;
  moveHistory: string[];
  status: GameStatus;
  turn: 'w' | 'b';
  isCheck: boolean;
  thinking: 'white' | 'black' | null;
  winner: 'white' | 'black' | 'draw' | null;
  errorMessage: string | null;
  moveCount: number;
  lastMove: { from: string; to: string } | null;
  capturedPieces: { white: string[]; black: string[] };
}

const STARTING_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const MAX_HALF_MOVES = 600;

function capturedPieces(game: ChessType): { white: string[]; black: string[] } {
  const result: { white: string[]; black: string[] } = { white: [], black: [] };
  for (const move of game.history({ verbose: true })) {
    if (move.captured) {
      if (move.color === 'w') result.white.push(move.captured);
      else result.black.push(move.captured);
    }
  }
  return result;
}

function snapState(
  game: ChessType,
  overrides: Partial<GameState> = {}
): GameState {
  const verboseHistory = game.history({ verbose: true });
  const last = verboseHistory.at(-1) ?? null;
  return {
    fen: game.fen(),
    moveHistory: game.history(),
    turn: game.turn() as 'w' | 'b',
    isCheck: game.isCheck(),
    moveCount: Math.ceil(verboseHistory.length / 2),
    lastMove: last ? { from: last.from, to: last.to } : null,
    capturedPieces: capturedPieces(game),
    status: 'playing',
    thinking: null,
    winner: null,
    errorMessage: null,
    ...overrides,
  };
}

export function useChessGame() {
  // ─── Refs (never cause re-renders) ───────────────────────────────
  const gameRef      = useRef(new Chess());
  const whiteModel   = useRef('');
  const blackModel   = useRef('');
  const moveDelay    = useRef(1500);
  const playingRef   = useRef(false);
  const pendingMove  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Public model/delay state ─────────────────────────────────────
  const [whiteModelState, setWhiteModelDisplay] = useState('');
  const [blackModelState, setBlackModelDisplay] = useState('');
  const [moveDelayState,  setMoveDelayDisplay]  = useState(1500);

  // ─── Single react-controlled state atom ──────────────────────────
  const [gameState, setGameState] = useState<GameState>({
    fen: STARTING_FEN,
    moveHistory: [],
    status: 'idle',
    turn: 'w',
    isCheck: false,
    thinking: null,
    winner: null,
    errorMessage: null,
    moveCount: 0,
    lastMove: null,
    capturedPieces: { white: [], black: [] },
  });

  // ─── Setters that mirror to refs ─────────────────────────────────
  const setWhiteModel = useCallback((m: string) => {
    whiteModel.current = m;
    setWhiteModelDisplay(m);
  }, []);

  const setBlackModel = useCallback((m: string) => {
    blackModel.current = m;
    setBlackModelDisplay(m);
  }, []);

  const setMoveDelay = useCallback((d: number) => {
    moveDelay.current = d;
    setMoveDelayDisplay(d);
  }, []);

  // ─── Core: request one move ───────────────────────────────────────
  const requestMove = useCallback(async () => {
    const game = gameRef.current;

    if (!playingRef.current || game.isGameOver()) return;
    if (game.history().length >= MAX_HALF_MOVES) {
      setGameState(snapState(game, { status: 'draw', winner: 'draw', thinking: null }));
      playingRef.current = false;
      return;
    }

    const turn  = game.turn();
    const color: 'white' | 'black' = turn === 'w' ? 'white' : 'black';
    const model = turn === 'w' ? whiteModel.current : blackModel.current;
    const legalMoves = game.moves();
    const fen  = game.fen();
    const hist = game.history();

    // Show "thinking" immediately — board state is correct at this point
    setGameState(snapState(game, { thinking: color }));

    try {
      const san = await getAIMove(fen, hist, legalMoves, model, color);

      if (!playingRef.current) return; // paused/reset during API call

      // Apply the move
      let applied = false;
      try {
        game.move(san);
        applied = true;
      } catch {
        console.error(`[${color}] Invalid move "${san}" – picking random fallback`);
        const fallback = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        game.move(fallback);
        applied = true;
      }

      if (!applied) return;

      console.log(`[${color}] Moved: ${san} | New FEN: ${game.fen()}`);

      // Check game over
      if (game.isGameOver()) {
        let status: GameStatus = 'draw';
        let winner: 'white' | 'black' | 'draw' = 'draw';
        if (game.isCheckmate()) { status = 'checkmate'; winner = game.turn() === 'w' ? 'black' : 'white'; }
        else if (game.isStalemate()) { status = 'stalemate'; }
        setGameState(snapState(game, { status, winner, thinking: null }));
        playingRef.current = false;
        return;
      }

      // Push new board position to React — this is what moves the pieces
      setGameState(snapState(game, { thinking: null }));

      // Schedule next move
      pendingMove.current = setTimeout(() => {
        if (playingRef.current) requestMove();
      }, moveDelay.current);

    } catch (err) {
      if (!playingRef.current) return;
      const msg = err instanceof Error ? err.message : String(err);
      const winner: 'white' | 'black' = color === 'white' ? 'black' : 'white';
      setGameState(snapState(game, { status: 'forfeit', winner, thinking: null, errorMessage: msg }));
      playingRef.current = false;
    }
  }, []);

  // ─── Public controls ──────────────────────────────────────────────
  const startGame = useCallback(() => {
    if (!whiteModel.current || !blackModel.current) return;

    // Cancel any pending timeout
    if (pendingMove.current) clearTimeout(pendingMove.current);
    playingRef.current = false;

    // Fresh board
    gameRef.current = new Chess();
    playingRef.current = true;

    // Push the starting position first, then trigger first move
    setGameState(snapState(gameRef.current, { status: 'playing' }));

    pendingMove.current = setTimeout(() => requestMove(), 800);
  }, [requestMove]);

  const pauseGame = useCallback(() => {
    playingRef.current = false;
    if (pendingMove.current) clearTimeout(pendingMove.current);
    setGameState((prev) => ({ ...prev, status: 'paused', thinking: null }));
  }, []);

  const resumeGame = useCallback(() => {
    if (gameRef.current.isGameOver()) return;
    playingRef.current = true;
    setGameState((prev) => ({ ...prev, status: 'playing' }));
    pendingMove.current = setTimeout(() => requestMove(), 400);
  }, [requestMove]);

  const resetGame = useCallback(() => {
    playingRef.current = false;
    if (pendingMove.current) clearTimeout(pendingMove.current);
    gameRef.current = new Chess();
    setGameState({
      fen: STARTING_FEN,
      moveHistory: [],
      status: 'idle',
      turn: 'w',
      isCheck: false,
      thinking: null,
      winner: null,
      errorMessage: null,
      moveCount: 0,
      lastMove: null,
      capturedPieces: { white: [], black: [] },
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      playingRef.current = false;
      if (pendingMove.current) clearTimeout(pendingMove.current);
    };
  }, []);

  return {
    gameState,
    whiteModel: whiteModelState,
    blackModel: blackModelState,
    moveDelay: moveDelayState,
    setWhiteModel,
    setBlackModel,
    setMoveDelay,
    startGame,
    pauseGame,
    resumeGame,
    resetGame,
  };
}
