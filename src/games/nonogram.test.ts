import { describe, expect, it } from "vitest";
import {
  curated,
  generatePuzzle,
  hintNonogram,
  markNonogram,
  newNonogram,
  runs,
  solveByLogic,
} from "./nonogram";

describe("Nonogram", () => {
  const randomFromSeed = (seed: number) => () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  it("derives exact clue runs", () => {
    expect(runs([false, true, true, false, true])).toEqual([2, 1]);
    expect(runs([false, false])).toEqual([0]);
  });
  it("contains six correctly sized, logically solved drawings per size", () => {
    const unsolved: string[] = [];
    for (const size of [5, 10, 15] as const) {
      expect(curated[size]).toHaveLength(6);
      for (const puzzle of curated[size]) {
        expect(puzzle.solution).toHaveLength(size * size);
        if (
          JSON.stringify(solveByLogic(puzzle)) !==
          JSON.stringify(puzzle.solution)
        )
          unsolved.push(puzzle.id);
      }
    }
    expect(unsolved).toEqual([]);
  });
  it.each([5, 10, 15] as const)("generates verified %i puzzles", (size) => {
    for (const seed of [1, 23, 456]) {
      const puzzle = generatePuzzle(size, randomFromSeed(seed));
      expect(puzzle).not.toBeNull();
      expect(solveByLogic(puzzle!)).toEqual(puzzle!.solution);
    }
  });
  it("keeps mistakes, does not refund them on undo, and offers a hint", () => {
    const puzzle = curated[5][0];
    let game = newNonogram(puzzle);
    const wrong = puzzle.solution.findIndex((cell) => !cell);
    game = markNonogram(game, wrong, 1);
    expect(game.errors).toBe(1);
    expect(game.marks[wrong]).toBe(1);
    game = markNonogram(game, wrong, 0);
    expect(game.errors).toBe(1);
    game = hintNonogram(game, () => 0);
    expect(game.hints).toBe(1);
    expect(game.marks.filter(Boolean)).toHaveLength(1);
  });
  it("loses on three wrong marks", () => {
    const puzzle = curated[5][0];
    let game = newNonogram(puzzle);
    for (const index of puzzle.solution
      .map((cell, i) => (!cell ? i : -1))
      .filter((i) => i >= 0)
      .slice(0, 3))
      game = markNonogram(game, index, 1);
    expect(game.status).toBe("lost");
  });
  it("wins when all picture squares are filled without requiring X marks", () => {
    const puzzle = curated[5][0];
    let game = newNonogram(puzzle);
    for (const [index, filled] of puzzle.solution.entries()) {
      if (filled) game = markNonogram(game, index, 1);
    }
    expect(game.status).toBe("won");
    expect(game.marks).toContain(0);
  });
});
