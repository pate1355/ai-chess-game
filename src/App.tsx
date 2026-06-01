import React, { useState, useEffect, useCallback } from 'react';
import { useChessGame } from './hooks/useChessGame';
import type { GameStatus } from './hooks/useChessGame';
import {
  fetchAvailableModels,
  setBaseUrl,
  getBaseUrl,
} from './services/chessAI';
import type { Model } from './services/chessAI';
import ChessBoardWrapper from './components/ChessBoard';
import PlayerCard from './components/PlayerCard';
import MoveHistory from './components/MoveHistory';

function getStatusMessage(
  status: GameStatus,
  turn: 'w' | 'b',
  isCheck: boolean,
  winner: 'white' | 'black' | 'draw' | null
): { text: string; icon: string; className: string } {
  if (status === 'playing' && isCheck) {
    return {
      text: `${turn === 'w' ? 'White' : 'Black'} is in check!`,
      icon: '⚠️',
      className: 'check',
    };
  }

  switch (status) {
    case 'playing':
      return {
        text: `${turn === 'w' ? 'White' : 'Black'} to move`,
        icon: turn === 'w' ? '♔' : '♚',
        className: 'playing',
      };
    case 'paused':
      return { text: 'Game paused', icon: '⏸️', className: 'playing' };
    case 'checkmate':
      return {
        text: `Checkmate! ${winner === 'white' ? 'White' : 'Black'} wins!`,
        icon: '👑',
        className: 'checkmate',
      };
    case 'stalemate':
      return { text: 'Stalemate — Draw!', icon: '🤝', className: 'stalemate' };
    case 'draw':
      return { text: 'Game drawn', icon: '🤝', className: 'draw' };
    case 'forfeit':
      return {
        text: `${winner === 'white' ? 'White' : 'Black'} wins by forfeit`,
        icon: '🏳️',
        className: 'forfeit',
      };
    case 'error':
      return { text: 'Error occurred', icon: '❌', className: 'error' };
    default:
      return { text: '', icon: '', className: '' };
  }
}

function getPlayerResult(
  color: 'white' | 'black',
  winner: 'white' | 'black' | 'draw' | null
): 'win' | 'loss' | 'draw' | null {
  if (!winner) return null;
  if (winner === 'draw') return 'draw';
  return winner === color ? 'win' : 'loss';
}

const App: React.FC = () => {
  const {
    gameState,
    whiteModel,
    blackModel,
    moveDelay,
    setWhiteModel,
    setBlackModel,
    setMoveDelay,
    startGame,
    pauseGame,
    resumeGame,
    resetGame,
  } = useChessGame();

  const [models, setModels] = useState<Model[]>([]);
  const [serverUrl, setServerUrl] = useState(
    getBaseUrl().replace('/v1', '')
  );
  const [connectionStatus, setConnectionStatus] = useState<
    'idle' | 'loading' | 'connected' | 'error'
  >('idle');
  const [connectionError, setConnectionError] = useState('');
  const [showWinnerOverlay, setShowWinnerOverlay] = useState(false);

  // Show winner overlay when game ends
  useEffect(() => {
    if (
      gameState.status === 'checkmate' ||
      gameState.status === 'stalemate' ||
      gameState.status === 'draw' ||
      gameState.status === 'forfeit'
    ) {
      const timer = setTimeout(() => setShowWinnerOverlay(true), 800);
      return () => clearTimeout(timer);
    } else {
      setShowWinnerOverlay(false);
    }
  }, [gameState.status]);

  const handleConnect = useCallback(async () => {
    setConnectionStatus('loading');
    setConnectionError('');
    try {
      setBaseUrl(serverUrl);
      const fetchedModels = await fetchAvailableModels();
      setModels(fetchedModels);
      setConnectionStatus('connected');

      // Auto-select if exactly 2 models
      if (fetchedModels.length >= 1 && !whiteModel) {
        setWhiteModel(fetchedModels[0].id);
      }
      if (fetchedModels.length >= 2 && !blackModel) {
        setBlackModel(fetchedModels[1].id);
      }
    } catch (err) {
      setConnectionStatus('error');
      setConnectionError(
        err instanceof Error ? err.message : 'Connection failed'
      );
    }
  }, [serverUrl, whiteModel, blackModel, setWhiteModel, setBlackModel]);

  // Auto-connect on mount
  useEffect(() => {
    handleConnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isGameActive =
    gameState.status === 'playing' || gameState.status === 'paused';
  const isGameOver =
    gameState.status === 'checkmate' ||
    gameState.status === 'stalemate' ||
    gameState.status === 'draw' ||
    gameState.status === 'forfeit';
  const canStart =
    connectionStatus === 'connected' && whiteModel && blackModel;

  const statusInfo = getStatusMessage(
    gameState.status,
    gameState.turn,
    gameState.isCheck,
    gameState.winner
  );

  // ================================================================
  // RENDER — Setup Screen
  // ================================================================
  if (gameState.status === 'idle') {
    return (
      <div className="app">
        <header className="app-header">
          <h1>
            <span className="header-icon">♟</span>
            <span className="gradient-text">AI Chess Arena</span>
          </h1>
          <p className="subtitle">
            Watch two AI models battle it out on the chessboard
          </p>
        </header>

        <div className="setup-screen">
          <div className="setup-card glass-card">
            <h2>⚙️ Game Setup</h2>

            {/* Server URL */}
            <div className="setup-section">
              <label>
                <span className="label-icon">🖥️</span>
                LM Studio Server
              </label>
              <div className="input-row">
                <input
                  type="text"
                  className="input-field"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="http://localhost:1234"
                />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleConnect}
                  disabled={connectionStatus === 'loading'}
                >
                  {connectionStatus === 'loading' ? (
                    <span className="spinner" />
                  ) : (
                    'Connect'
                  )}
                </button>
              </div>
            </div>

            {/* Connection Status */}
            {connectionStatus !== 'idle' && (
              <div
                className={`connection-status ${
                  connectionStatus === 'connected'
                    ? 'success'
                    : connectionStatus === 'error'
                      ? 'error'
                      : 'loading'
                }`}
              >
                <span
                  className={`status-dot ${
                    connectionStatus === 'connected'
                      ? 'success'
                      : connectionStatus === 'error'
                        ? 'error'
                        : 'loading'
                  }`}
                />
                {connectionStatus === 'connected'
                  ? `Connected — ${models.length} model${models.length !== 1 ? 's' : ''} available`
                  : connectionStatus === 'error'
                    ? connectionError
                    : 'Connecting…'}
              </div>
            )}

            {/* Model Selection */}
            {connectionStatus === 'connected' && models.length > 0 && (
              <>
                <div className="setup-section">
                  <label>
                    <span className="label-icon">♔</span>
                    White Player
                  </label>
                  <select
                    className="select-field"
                    value={whiteModel}
                    onChange={(e) => setWhiteModel(e.target.value)}
                  >
                    <option value="">Select a model…</option>
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="setup-section">
                  <label>
                    <span className="label-icon">♚</span>
                    Black Player
                  </label>
                  <select
                    className="select-field"
                    value={blackModel}
                    onChange={(e) => setBlackModel(e.target.value)}
                  >
                    <option value="">Select a model…</option>
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.id}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Move delay */}
                <div className="setup-section">
                  <label>⏱️ Move Delay</label>
                  <div className="delay-slider">
                    <input
                      type="range"
                      min={200}
                      max={5000}
                      step={100}
                      value={moveDelay}
                      onChange={(e) => setMoveDelay(Number(e.target.value))}
                    />
                    <span className="delay-value">
                      {(moveDelay / 1000).toFixed(1)}s
                    </span>
                  </div>
                </div>

                {/* Start button */}
                <button
                  className="btn btn-primary btn-full"
                  disabled={!canStart}
                  onClick={startGame}
                >
                  ⚔️ Start Battle
                </button>
              </>
            )}

            {connectionStatus === 'connected' && models.length === 0 && (
              <div className="connection-status error">
                <span className="status-dot error" />
                No models loaded in LM Studio. Please load at least one model.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ================================================================
  // RENDER — Game Screen
  // ================================================================
  return (
    <div className="app">
      <header className="app-header">
        <h1>
          <span className="header-icon">♟</span>
          <span className="gradient-text">AI Chess Arena</span>
        </h1>
      </header>

      <div className="game-layout">
        {/* Left Sidebar — White Player */}
        <div>
          <PlayerCard
            color="white"
            modelName={whiteModel}
            isThinking={gameState.thinking === 'white'}
            isActive={gameState.turn === 'w' && gameState.status === 'playing'}
            capturedPieces={gameState.capturedPieces.white}
            result={getPlayerResult('white', gameState.winner)}
          />

          {/* Game Controls below white player */}
          <div
            style={{
              marginTop: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {isGameActive && (
              <>
                {gameState.status === 'playing' ? (
                  <button className="btn btn-secondary btn-full" onClick={pauseGame}>
                    ⏸️ Pause
                  </button>
                ) : (
                  <button className="btn btn-primary btn-full" onClick={resumeGame}>
                    ▶️ Resume
                  </button>
                )}
              </>
            )}
            <button
              className="btn btn-danger btn-full"
              onClick={resetGame}
            >
              🔄 New Game
            </button>

            {/* Speed control */}
            {isGameActive && (
              <div className="speed-control-card glass-card">
                <h3>⏱️ Speed</h3>
                <div className="delay-slider">
                  <input
                    type="range"
                    min={200}
                    max={5000}
                    step={100}
                    value={moveDelay}
                    onChange={(e) => setMoveDelay(Number(e.target.value))}
                  />
                  <span className="delay-value">
                    {(moveDelay / 1000).toFixed(1)}s
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center — Board */}
        <div className="board-area">
          {/* Status banner */}
          {(isGameActive || isGameOver) && (
            <div className={`game-status-banner ${statusInfo.className}`}>
              <span>{statusInfo.icon}</span>
              <span>{statusInfo.text}</span>
            </div>
          )}

          <ChessBoardWrapper
            fen={gameState.fen}
            lastMove={gameState.lastMove}
            isCheck={gameState.isCheck}
            turn={gameState.turn}
          />

          {/* Move counter */}
          <div className="game-controls-bar">
            <span className="move-counter">
              Move {gameState.moveCount}
            </span>
          </div>

          {/* Error detail */}
          {gameState.errorMessage && (
            <div className="error-detail">{gameState.errorMessage}</div>
          )}
        </div>

        {/* Right Sidebar — Black Player + Move History */}
        <div className="right-sidebar">
          <PlayerCard
            color="black"
            modelName={blackModel}
            isThinking={gameState.thinking === 'black'}
            isActive={gameState.turn === 'b' && gameState.status === 'playing'}
            capturedPieces={gameState.capturedPieces.black}
            result={getPlayerResult('black', gameState.winner)}
          />

          <MoveHistory moves={gameState.moveHistory} />
        </div>
      </div>

      {/* Winner Overlay */}
      {showWinnerOverlay && (
        <div
          className="winner-overlay"
          onClick={() => setShowWinnerOverlay(false)}
        >
          <div
            className="winner-card glass-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="trophy">
              {gameState.winner === 'draw' ? '🤝' : '🏆'}
            </div>
            <h2 className="gradient-text">
              {gameState.winner === 'draw'
                ? 'It\'s a Draw!'
                : `${gameState.winner === 'white' ? 'White' : 'Black'} Wins!`}
            </h2>
            <p className="winner-model">
              {gameState.winner === 'draw'
                ? 'Both models fought to a standstill'
                : gameState.winner === 'white'
                  ? whiteModel
                  : blackModel}
            </p>
            <p className="winner-method">
              {gameState.status === 'checkmate' && 'by Checkmate'}
              {gameState.status === 'stalemate' && 'Stalemate'}
              {gameState.status === 'draw' && 'Draw by repetition / insufficient material'}
              {gameState.status === 'forfeit' && 'by Forfeit (illegal move)'}
            </p>
            <p className="winner-method">
              {gameState.moveHistory.length} moves played
            </p>
            <button
              className="btn btn-primary"
              onClick={resetGame}
              style={{ marginTop: '8px' }}
            >
              🔄 Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
