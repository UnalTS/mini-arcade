import { afterEach, expect, it, vi } from "vitest";
import { newMineGame } from "./games/minesweeper";
import { addWin, emptyStore, readStore, winsFor } from "./store";

afterEach(() => vi.unstubAllGlobals());

it("repairs saved Minesweeper numbers from the actual mine layout", () => {
  const game = newMineGame("beginner");
  game.started = true;
  game.status = "playing";
  game.cells[0].mine = true;
  game.cells[1].mine = true;
  game.cells[2].mine = true;
  game.cells[10].revealed = true;
  game.cells[10].nearby = 1;
  const stored = { ...emptyStore(), minesweeper: game };
  vi.stubGlobal("localStorage", { getItem: () => JSON.stringify(stored) });

  const loaded = readStore();
  expect(loaded.minesweeper?.cells[10].nearby).toBe(3);
  expect(loaded.minesweeper?.cells[10].revealed).toBe(true);
});

it("migrates version 1 without losing existing games and preferences", () => {
  const old = {
    ...emptyStore(),
    version: 1,
    language: "en",
    theme: "dark",
    scores: { "minesweeper:beginner": { wins: 2, best: 40 } },
  };
  vi.stubGlobal("localStorage", {
    getItem: (key: string) =>
      key === "mini-arcade-v1" ? JSON.stringify(old) : null,
  });
  const loaded = readStore();
  expect(loaded.version).toBe(2);
  expect(loaded.language).toBe("en");
  expect(loaded.theme).toBe("dark");
  expect(loaded.scores["minesweeper:beginner"].wins).toBe(2);
  expect(loaded.scores["minesweeper:beginner"]).toEqual({ wins: 2 });
  expect(loaded.nonogram?.puzzle.id).toBe("5-0");
  expect(loaded.snakeBest).toBe(0);
});

it("falls back to the old save if the new save is damaged", () => {
  const old = { ...emptyStore(), version: 1, snakeBest: 0, language: "en" };
  vi.stubGlobal("localStorage", {
    getItem: (key: string) =>
      key === "mini-arcade-v2" ? "{broken" : JSON.stringify(old),
  });
  expect(readStore().language).toBe("en");
});

it("counts wins by exact difficulty and ignores older best times", () => {
  const scores = {
    "sudoku:easy:regular": { wins: 2 },
    "sudoku:easy:assisted": { wins: 1 },
    "sudoku:hard:regular": { wins: 3 },
    "minesweeper:beginner": { wins: 2 },
    "minesweeper:expert": { wins: 3 },
    "nonogram:5:curated:regular": { wins: 2 },
    "nonogram:5:generated:assisted": { wins: 1 },
  };
  expect(winsFor(scores, "sudoku:easy")).toBe(3);
  expect(winsFor(scores, "sudoku:hard")).toBe(3);
  expect(winsFor(scores, "minesweeper:beginner")).toBe(2);
  expect(winsFor(scores, "minesweeper:expert")).toBe(3);
  expect(winsFor(scores, "nonogram:5")).toBe(3);
  expect(winsFor(scores, "nonogram:15")).toBe(0);
  expect(
    addWin(scores, "minesweeper:beginner")["minesweeper:beginner"],
  ).toEqual({ wins: 3 });
});
