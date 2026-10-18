import type { GameResult } from "./simulate.js";

export interface WilsonInterval {
  readonly estimate: number;
  readonly lower: number;
  readonly upper: number;
  readonly successes: number;
  readonly trials: number;
}

export interface SeatAdvantage {
  readonly seats: readonly WilsonInterval[];
  readonly draws: WilsonInterval;
  readonly completed: number;
}

export function wilsonInterval(successes: number, trials: number, z = 1.96): WilsonInterval {
  if (!Number.isSafeInteger(successes) || !Number.isSafeInteger(trials) || trials < 0) {
    throw new RangeError("Wilson interval requires non-negative integer counts");
  }
  if (successes < 0 || successes > trials) {
    throw new RangeError("Wilson successes must be between zero and trials");
  }
  if (!Number.isFinite(z) || z <= 0) throw new RangeError("z must be positive and finite");
  if (trials === 0) return { estimate: 0, lower: 0, upper: 0, successes, trials };

  const proportion = successes / trials;
  const zSquared = z * z;
  const denominator = 1 + zSquared / trials;
  const center = (proportion + zSquared / (2 * trials)) / denominator;
  const margin =
    (z * Math.sqrt((proportion * (1 - proportion)) / trials + zSquared / (4 * trials * trials))) /
    denominator;
  return {
    estimate: proportion,
    lower: Math.max(0, center - margin),
    upper: Math.min(1, center + margin),
    successes,
    trials,
  };
}

export function seatAdvantage(results: readonly GameResult[], playerCount: number): SeatAdvantage {
  if (!Number.isSafeInteger(playerCount) || playerCount < 2) {
    throw new RangeError("playerCount must be an integer of at least 2");
  }
  const completed = results.filter(
    (result): result is GameResult & { readonly outcome: NonNullable<GameResult["outcome"]> } =>
      result.status === "finished" && result.outcome !== undefined,
  );
  const seatWins = Array.from({ length: playerCount }, () => 0);
  let draws = 0;
  for (const result of completed) {
    const winners = result.outcome.ranking[0];
    if (!winners || winners.length !== 1) {
      draws += 1;
      continue;
    }
    const winner = winners[0];
    if (winner === undefined || winner < 0 || winner >= playerCount) {
      throw new RangeError(`Outcome has invalid winner seat ${String(winner)}`);
    }
    const currentWins = seatWins[winner];
    if (currentWins === undefined)
      throw new RangeError(`Outcome has invalid winner seat ${winner}`);
    seatWins[winner] = currentWins + 1;
  }
  return {
    seats: seatWins.map((wins) => wilsonInterval(wins, completed.length)),
    draws: wilsonInterval(draws, completed.length),
    completed: completed.length,
  };
}

export function significantSeatAdvantage(
  results: readonly GameResult[],
  playerCount: number,
): number | null {
  if (playerCount !== 2) return null;
  const completed = results.filter(
    (result): result is GameResult & { readonly outcome: NonNullable<GameResult["outcome"]> } =>
      result.status === "finished" && result.outcome !== undefined,
  );
  if (completed.length === 0) return null;
  let seatZeroWins = 0;
  let seatOneWins = 0;
  for (const result of completed) {
    const winners = result.outcome.ranking[0];
    if (!winners || winners.length !== 1) continue;
    if (winners[0] === 0) seatZeroWins += 1;
    else if (winners[0] === 1) seatOneWins += 1;
  }
  const trials = completed.length;
  const difference = (seatZeroWins - seatOneWins) / trials;
  const variance = (seatZeroWins + seatOneWins) / trials - difference * difference;
  if (variance === 0) return null;
  const zScore = Math.abs(difference) / Math.sqrt(variance / trials);
  if (zScore <= 3.2905267314919255) return null;
  return difference > 0 ? 0 : 1;
}

export function quantile(values: readonly number[], probability: number): number {
  if (values.length === 0) throw new RangeError("Cannot find a quantile in an empty sample");
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
    throw new RangeError("Quantile probability must be between 0 and 1");
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil(probability * sorted.length) - 1);
  const value = sorted[index];
  if (value === undefined) throw new Error("Quantile index is outside the sample");
  return value;
}
