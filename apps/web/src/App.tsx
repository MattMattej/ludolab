import { type GameMove, type GameState, gameRegistry } from "@tabletest/games";
import { createRandomPlayer } from "@tabletest/players";
import { SceneView } from "@tabletest/render";
import { useEffect, useMemo, useState } from "react";

type PlayMode = "watch" | "play";

const options = [
  { id: "nim", label: "Nim" },
  { id: "tictactoe", label: "Tic-tac-toe" },
] as const;

const player = createRandomPlayer<GameState, GameMove>();

function initialState(): GameState {
  const game = gameRegistry.tictactoe;
  if (!game) throw new Error("Tic-tac-toe game module is not registered");
  return game.setup({ players: 2, seed: "web-demo-1" });
}

export function App(): React.ReactElement {
  const [gameId, setGameId] = useState("tictactoe");
  const [mode, setMode] = useState<PlayMode>("watch");
  const [speed, setSpeed] = useState(1);
  const [seedCounter, setSeedCounter] = useState(1);
  const [state, setState] = useState<GameState>(initialState);
  const game = gameRegistry[gameId];
  if (!game) throw new Error(`Missing game module for ${gameId}`);
  const scene = useMemo(() => game.scene(state, 0), [game, state]);
  const currentSeat = game.toAct(state);
  const isTerminal = game.isTerminal(state);
  const legalMoves = isTerminal ? [] : game.legalMoves(state);
  const legalAnchors =
    mode === "play" && currentSeat === 0
      ? [...new Set(legalMoves.flatMap((move) => game.moveAnchors(move)))]
      : [];

  const startNewGame = (nextGame = gameId, nextSeed = `web-demo-${seedCounter + 1}`): void => {
    const nextModule = gameRegistry[nextGame];
    if (!nextModule) throw new Error(`Unknown game ${nextGame}`);
    setState(nextModule.setup({ players: 2, seed: nextSeed }));
    setSeedCounter((counter) => counter + 1);
  };

  useEffect(() => {
    const isBotTurn = mode === "watch" || currentSeat !== 0;
    if (!isBotTurn || isTerminal) return;
    const delay = speed === 8 ? 0 : 900 / speed;
    const timer = window.setTimeout(() => {
      const nextState = game.clone(state);
      const seat = game.toAct(nextState);
      if (seat === null) return;
      const moves = game.legalMoves(nextState);
      if (moves.length === 0) throw new Error(`Non-terminal ${gameId} state has no legal moves`);
      const move = player.choose(game.observe(nextState, seat), moves, { rng: nextState.rng });
      game.apply(nextState, move);
      setState(nextState);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [currentSeat, game, gameId, isTerminal, mode, speed, state]);

  const onNodeClick = (nodeId: string): void => {
    if (mode !== "play" || currentSeat !== 0 || isTerminal) return;
    const move = legalMoves.find((candidate) => game.moveAnchors(candidate).includes(nodeId));
    if (!move) return;
    const nextState = game.clone(state);
    game.apply(nextState, move);
    setState(nextState);
  };

  const onGameChange = (nextGameId: string): void => {
    setGameId(nextGameId);
    startNewGame(nextGameId);
  };

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="wordmark" href="./" aria-label="Tabletest home">
          <span className="wordmark-mark" aria-hidden="true">
            T
          </span>
          Tabletest
        </a>
        <span className="topbar-note">A testbench for tabletop games</span>
      </header>
      <section className="intro">
        <div>
          <p className="eyebrow">Chapter 1 · playable prototype</p>
          <h1>Bring a game to the table.</h1>
          <p className="intro-copy">Watch seeded bots play, or take a seat and make a move.</p>
        </div>
        <div className="controls" aria-label="Game settings">
          <label>
            <span>Game</span>
            <select value={gameId} onChange={(event) => onGameChange(event.target.value)}>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Mode</span>
            <select value={mode} onChange={(event) => setMode(event.target.value as PlayMode)}>
              <option value="watch">Bot vs bot</option>
              <option value="play">Play vs bot</option>
            </select>
          </label>
        </div>
      </section>
      <section className="table-panel" aria-label="Game">
        <div className="table-heading">
          <div>
            <p className="eyebrow">Current game</p>
            <h2>{scene.status}</h2>
          </div>
          <button className="new-game-button" type="button" onClick={() => startNewGame()}>
            New game
          </button>
        </div>
        <SceneView
          scene={scene}
          legalAnchors={legalAnchors}
          onNodeClick={onNodeClick}
          speed={speed}
          className="game-scene"
          title={`${game.meta.name} game table`}
        />
        <div className="table-footer">
          <div className="speed-control">
            <label htmlFor="speed">Animation speed</label>
            <select
              id="speed"
              value={speed}
              onChange={(event) => setSpeed(Number(event.target.value))}
            >
              <option value={0.25}>0.25×</option>
              <option value={0.5}>0.5×</option>
              <option value={1}>1×</option>
              <option value={2}>2×</option>
              <option value={4}>4×</option>
              <option value={8}>Instant</option>
            </select>
          </div>
          {mode === "play" && !isTerminal && currentSeat === 0 && (
            <p className="hint">Choose a highlighted cell or stone to make your move.</p>
          )}
          {scene.log && scene.log.length > 0 && (
            <details className="move-log">
              <summary>Move list ({scene.log.length})</summary>
              <ol>
                {scene.log.map((entry, index) => (
                  <li key={`${index}-${entry}`}>{entry}</li>
                ))}
              </ol>
            </details>
          )}
        </div>
      </section>
      <footer className="page-footer">
        <span>Deterministic games. No accounts, analytics, or server-side data.</span>
        <span>MIT · Tabletest</span>
      </footer>
    </main>
  );
}
