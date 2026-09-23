import { describe, expect, it } from "vitest";
import {
  chordMine,
  MINE_LEVELS,
  neighbors,
  newMineGame,
  placeMines,
  revealMine,
  toggleFlag,
  type MineLevel,
} from "./minesweeper";

describe("Minesweeper", () => {
  it.each(["beginner", "intermediate", "expert"] as MineLevel[])(
    "every number matches actual adjacent mines on %s boards",
    (level) => {
      const { width, height } = MINE_LEVELS[level];
      for (const first of [
        0,
        Math.floor((width * height) / 2),
        width * height - 1,
      ]) {
        const cells = placeMines(newMineGame(level), first, () => 0.37);
        cells.forEach((cell, index) => {
          const actual = neighbors(index, width, height).filter(
            (other) => cells[other].mine,
          ).length;
          expect(cell.nearby).toBe(actual);
        });
      }
    },
  );

  it.each(["beginner", "intermediate", "expert"] as MineLevel[])(
    "protects the first area on %s",
    (level) => {
      const game = revealMine(newMineGame(level), 0, () => 0.5);
      const { width, height, mines } = MINE_LEVELS[level];
      expect(game.cells.filter((cell) => cell.mine)).toHaveLength(mines);
      expect(
        [0, ...neighbors(0, width, height)].every(
          (index) => !game.cells[index].mine,
        ),
      ).toBe(true);
      expect(game.cells[0].revealed).toBe(true);
    },
  );

  it("does not reveal a flagged square", () => {
    const flagged = toggleFlag(newMineGame("beginner"), 0);
    expect(revealMine(flagged, 0)).toBe(flagged);
  });

  it("chords only when nearby flag count matches", () => {
    const game = newMineGame("beginner");
    game.status = "playing";
    game.started = true;
    game.cells[10].revealed = true;
    game.cells[10].nearby = 1;
    game.cells[0].mine = true;
    expect(chordMine(game, 10)).toBe(game);
    const flagged = toggleFlag(game, 0);
    expect(chordMine(flagged, 10)).not.toBe(flagged);
  });

  it("loses if chord flags the wrong neighbor and opens a mine", () => {
    const game = newMineGame("beginner");
    game.status = "playing";
    game.started = true;
    game.cells[10].revealed = true;
    game.cells[10].nearby = 1;
    game.cells[0].mine = true;
    const flagged = toggleFlag(game, 1);
    const next = chordMine(flagged, 10);
    expect(next.status).toBe("lost");
    expect(next.cells[0].revealed).toBe(true);
  });
});
