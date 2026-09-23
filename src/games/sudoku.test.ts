import { describe, expect, it } from "vitest";
import {
  countSolutions,
  enterSudoku,
  generateSudoku,
  hintSudoku,
  newSudokuGame,
  ratePuzzle,
  undoSudoku,
  type SudokuLevel,
} from "./sudoku";

describe("Sudoku", () => {
  it.each(["easy", "medium", "hard"] as SudokuLevel[])(
    "generates a unique %s puzzle",
    (level) => {
      for (let sample = 0; sample < 5; sample++) {
        const { puzzle, solution } = generateSudoku(level);
        expect(puzzle).toHaveLength(81);
        expect(countSolutions(puzzle)).toEqual({ count: 1, solution });
        expect(ratePuzzle(puzzle)).toBe(level);
      }
    },
    30000,
  );

  it("keeps counted mistakes after undo and ends on the third mistake", () => {
    const solution = Array.from({ length: 81 }, (_, index) => (index % 9) + 1);
    let game = newSudokuGame("easy", Array(81).fill(0), solution);
    game = enterSudoku(game, 0, 2);
    expect(game.errors).toBe(1);
    game = undoSudoku(game);
    expect(game.values[0]).toBe(0);
    expect(game.errors).toBe(1);
    game = enterSudoku(game, 0, 3);
    game = enterSudoku(game, 0, 4);
    expect(game.status).toBe("lost");
  });

  it("lets a hint correct a wrong cell and marks the game assisted", () => {
    const solution = Array.from({ length: 81 }, (_, index) => (index % 9) + 1);
    let game = newSudokuGame("easy", Array(81).fill(0), solution);
    game = enterSudoku(game, 0, 2);
    game = hintSudoku(game, 0);
    expect(game.values[0]).toBe(1);
    expect(game.errors).toBe(1);
    expect(game.hints).toBe(1);
  });

  it("wins only when all 81 values match the solution", () => {
    const { puzzle, solution } = generateSudoku("easy");
    let game = newSudokuGame("easy", puzzle, solution);
    for (let index = 0; index < 81; index++)
      if (!puzzle[index]) game = enterSudoku(game, index, solution[index]);
    expect(game.status).toBe("won");
    expect(game.errors).toBe(0);
  });
});
