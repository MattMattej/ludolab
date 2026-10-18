import { describe, expect, it } from "vitest";
import { run } from "../src/index.js";

describe("tabletest sim CLI", () => {
  it("prints deterministic simulation output apart from elapsed time", () => {
    const first = run(["sim", "tictactoe", "--games", "100", "--seed", "demo"]);
    const second = run(["sim", "tictactoe", "--games", "100", "--seed", "demo"]);
    const stripDuration = (output: string): string =>
      output.replace(/Completed in .+/, "Completed");
    expect(stripDuration(first)).toBe(stripDuration(second));
    expect(first).toContain('100 games · random vs random · seed "demo"');
    expect(first).toContain("Seat advantage");
    expect(first).toContain("Game length:");
  });

  it("validates required command options", () => {
    expect(() => run(["sim", "unknown", "--games", "1", "--seed", "x"])).toThrow(/Unknown game/);
    expect(() => run(["sim", "nim", "--games", "0", "--seed", "x"])).toThrow(/positive integer/);
    expect(() => run(["sim", "nim", "--games", "1"])).toThrow(/--seed/);
  });
});
