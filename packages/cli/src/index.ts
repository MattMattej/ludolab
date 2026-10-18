#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { getGame } from "@tabletest/games";
import type { GameMove, GameState } from "@tabletest/games";
import { createRandomPlayer } from "@tabletest/players";
import { quantile, seatAdvantage, significantSeatAdvantage, simulate } from "@tabletest/sim";
import type { WilsonInterval } from "@tabletest/sim";

interface CliOptions {
  readonly gameId: string;
  readonly games: number;
  readonly seed: string;
}

function parsePositiveInteger(raw: string | undefined, flag: string): number {
  if (raw === undefined || !/^[1-9]\d*$/.test(raw)) {
    throw new Error(`${flag} must be a positive integer`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) throw new Error(`${flag} exceeds the safe integer range`);
  return value;
}

function parseArgs(args: readonly string[]): CliOptions {
  if (args[0] !== "sim") throw new Error("Usage: tabletest sim <nim|tictactoe> --games N --seed S");
  const gameId = args[1];
  if (gameId === undefined) throw new Error("A game id is required: nim or tictactoe");
  let games: number | undefined;
  let seed: string | undefined;
  for (let index = 2; index < args.length; index += 1) {
    const flag = args[index];
    const value = args[index + 1];
    if (flag === "--games") {
      games = parsePositiveInteger(value, "--games");
      index += 1;
    } else if (flag === "--seed") {
      if (value === undefined || value.startsWith("--")) throw new Error("--seed requires a value");
      seed = value;
      index += 1;
    } else {
      throw new Error(`Unknown argument "${flag}"`);
    }
  }
  if (games === undefined) throw new Error("Required option missing: --games N");
  if (seed === undefined) throw new Error("Required option missing: --seed S");
  return { gameId, games, seed };
}

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function interval(value: WilsonInterval): string {
  return `[${percent(value.lower)} – ${percent(value.upper)}]`;
}

export function run(args: readonly string[]): string {
  const options = parseArgs(args);
  const game = getGame(options.gameId);
  const players = Array.from({ length: game.meta.minPlayers }, () =>
    createRandomPlayer<GameState, GameMove>(),
  );
  const start = performance.now();
  const simulation = simulate({
    game,
    players,
    games: options.games,
    seed: options.seed,
    rotateSeats: true,
  });
  const durationSeconds = (performance.now() - start) / 1000;
  const advantage = seatAdvantage(simulation.games, players.length);
  if (advantage.completed === 0) {
    throw new Error("No games completed; seat advantage cannot be calculated");
  }
  const moveCounts = simulation.games
    .filter((result) => result.status === "finished")
    .map((result) => result.moves);
  const lines = [
    `Tabletest · ${game.meta.id} · ${options.games.toLocaleString("en-US")} games · random vs random · seed "${options.seed}"`,
    "",
    "Seat advantage",
    ...advantage.seats.map(
      (seat, index) => `  seat ${index}   ${percent(seat.estimate)}  ${interval(seat)}`,
    ),
    `  draws    ${percent(advantage.draws.estimate)}  ${interval(advantage.draws)}`,
  ];
  const leader = significantSeatAdvantage(simulation.games, players.length);
  if (leader !== null) lines.push(`  → seat ${leader} wins significantly more often (p < 0.001)`);
  lines.push(
    "",
    `Game length: median ${quantile(moveCounts, 0.5)} moves (p10 ${quantile(moveCounts, 0.1)} · p90 ${quantile(moveCounts, 0.9)})`,
    `Completed in ${durationSeconds.toFixed(2)} s`,
  );
  if (simulation.stalled > 0 || simulation.limited > 0) {
    lines.push(
      `Incomplete: ${simulation.stalled} stalled, ${simulation.limited} move limit reached`,
    );
  }
  return lines.join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(run(process.argv.slice(2)));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`tabletest: ${message}`);
    process.exitCode = 3;
  }
}
