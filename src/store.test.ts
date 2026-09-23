import { afterEach, expect, it, vi } from "vitest";
import { newMineGame } from "./games/minesweeper";
import { emptyStore, readStore } from "./store";

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
