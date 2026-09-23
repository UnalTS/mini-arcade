import type { Language } from "./i18n";
import type { MineGame } from "./games/minesweeper";
import {
  adjacentMineCount,
  MINE_LEVELS,
  newMineGame,
} from "./games/minesweeper";
import type { SudokuGame } from "./games/sudoku";
import type { NonogramGame, NonogramSize } from "./games/nonogram";
import { curated, makePuzzle, newNonogram } from "./games/nonogram";

export type Theme = "system" | "light" | "dark";
export type Score = { wins: number };
export type Store = {
  version: 2;
  language: Language;
  theme: Theme;
  sudoku: SudokuGame | null;
  minesweeper: MineGame | null;
  nonogram: NonogramGame | null;
  nonogramProgress: Record<NonogramSize, number>;
  snakeBest: number;
  scores: Record<string, Score>;
};
const key = "mini-arcade-v2";
const oldKey = "mini-arcade-v1";
const initialLanguage = (): Language =>
  typeof navigator !== "undefined" &&
  navigator.language.toLowerCase().startsWith("en")
    ? "en"
    : "de";
export const emptyStore = (): Store => ({
  version: 2,
  language: initialLanguage(),
  theme: "system",
  sudoku: null,
  minesweeper: newMineGame("beginner"),
  nonogram: newNonogram(curated[5][0]),
  nonogramProgress: { 5: 0, 10: 0, 15: 0 },
  snakeBest: 0,
  scores: {},
});
const isArray = (value: unknown, size: number) =>
  Array.isArray(value) && value.length === size;
const isCount = (value: unknown): value is number =>
  Number.isInteger(value) && typeof value === "number" && value >= 0;
const isDigits = (value: unknown) =>
  Array.isArray(value) &&
  value.length === 81 &&
  value.every(
    (digit: unknown) =>
      typeof digit === "number" &&
      Number.isInteger(digit) &&
      digit >= 0 &&
      digit <= 9,
  );
function validSudoku(value: unknown): value is SudokuGame {
  if (!value || typeof value !== "object") return false;
  const game = value as Partial<SudokuGame>;
  return (
    ["easy", "medium", "hard"].includes(game.level || "") &&
    ["ready", "playing", "paused", "won", "lost"].includes(game.status || "") &&
    isDigits(game.puzzle) &&
    isDigits(game.solution) &&
    isDigits(game.values) &&
    isArray(game.notes, 81) &&
    game.notes!.every(
      (note) =>
        Array.isArray(note) &&
        note.every(
          (digit) => Number.isInteger(digit) && digit >= 1 && digit <= 9,
        ),
    ) &&
    isCount(game.errors) &&
    isCount(game.hints) &&
    isCount(game.elapsed) &&
    Array.isArray(game.history) &&
    game.history.every(
      (move) =>
        isDigits(move.values) &&
        isArray(move.notes, 81) &&
        move.notes.every(
          (note) =>
            Array.isArray(note) &&
            note.every(
              (digit) => Number.isInteger(digit) && digit >= 1 && digit <= 9,
            ),
        ),
    )
  );
}
function validMinesweeper(value: unknown): value is MineGame {
  if (!value || typeof value !== "object") return false;
  const game = value as Partial<MineGame>;
  const sizes = { beginner: 81, intermediate: 256, expert: 480 };
  return (
    !!game.level &&
    game.level in sizes &&
    ["ready", "playing", "won", "lost"].includes(game.status || "") &&
    isCount(game.elapsed) &&
    typeof game.started === "boolean" &&
    isArray(game.cells, sizes[game.level]) &&
    game.cells!.every(
      (cell) =>
        cell &&
        typeof cell.mine === "boolean" &&
        Number.isInteger(cell.nearby) &&
        cell.nearby >= 0 &&
        cell.nearby <= 8 &&
        typeof cell.revealed === "boolean" &&
        typeof cell.flagged === "boolean",
    )
  );
}

function validNonogram(value: unknown): value is NonogramGame {
  if (!value || typeof value !== "object") return false;
  const game = value as Partial<NonogramGame>;
  const puzzle = game.puzzle;
  if (
    !puzzle ||
    ![5, 10, 15].includes(puzzle.size) ||
    !["curated", "generated"].includes(puzzle.kind) ||
    typeof puzzle.id !== "string" ||
    typeof puzzle.name !== "string" ||
    !isArray(puzzle.solution, puzzle.size * puzzle.size) ||
    !puzzle.solution.every((cell) => typeof cell === "boolean")
  )
    return false;
  return (
    isArray(game.marks, puzzle.size * puzzle.size) &&
    game.marks!.every((mark) => [0, 1, 2].includes(mark)) &&
    Array.isArray(game.history) &&
    game.history.length <= 200 &&
    game.history.every(
      (marks) =>
        isArray(marks, puzzle.size * puzzle.size) &&
        marks.every((mark) => [0, 1, 2].includes(mark)),
    ) &&
    isCount(game.errors) &&
    game.errors <= 3 &&
    isCount(game.hints) &&
    isCount(game.elapsed) &&
    ["ready", "playing", "paused", "won", "lost"].includes(game.status || "")
  );
}

export function readStore(): Store {
  const initial = emptyStore();
  try {
    let parsed: unknown = null;
    for (const candidate of [
      localStorage.getItem(key),
      localStorage.getItem(oldKey),
    ]) {
      if (!candidate) continue;
      try {
        const value: unknown = JSON.parse(candidate);
        if (
          value &&
          typeof value === "object" &&
          "version" in value &&
          (value.version === 1 || value.version === 2)
        ) {
          parsed = value;
          break;
        }
      } catch {
        /* Try the older saved version. */
      }
    }
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("version" in parsed) ||
      (parsed.version !== 1 && parsed.version !== 2)
    )
      return initial;
    const value = parsed as Partial<Store>;
    const sudoku = validSudoku(value.sudoku) ? value.sudoku : null;
    const minesweeper = validMinesweeper(value.minesweeper)
      ? {
          ...value.minesweeper,
          cells: value.minesweeper.cells.map((cell, index) => ({
            ...cell,
            nearby: value.minesweeper!.started
              ? adjacentMineCount(
                  value.minesweeper!.cells,
                  index,
                  MINE_LEVELS[value.minesweeper!.level].width,
                  MINE_LEVELS[value.minesweeper!.level].height,
                )
              : 0,
          })),
        }
      : newMineGame("beginner");
    const scores: Record<string, Score> =
      value.scores && typeof value.scores === "object"
        ? Object.fromEntries(
            Object.entries(value.scores)
              .filter(([, score]) => score && isCount(score.wins))
              .map(([scoreKey, score]) => [scoreKey, { wins: score.wins }]),
          )
        : {};
    const progress = value.nonogramProgress;
    const nonogramProgress = Object.fromEntries(
      ([5, 10, 15] as const).map((size) => [
        size,
        progress && isCount(progress[size]) ? Math.min(6, progress[size]) : 0,
      ]),
    ) as Record<NonogramSize, number>;
    const nonogram = validNonogram(value.nonogram)
      ? {
          ...value.nonogram,
          puzzle: makePuzzle(
            value.nonogram.puzzle.id,
            value.nonogram.puzzle.size,
            value.nonogram.puzzle.kind,
            value.nonogram.puzzle.name,
            value.nonogram.puzzle.solution,
          ),
        }
      : newNonogram(curated[5][Math.min(nonogramProgress[5], 5)]);
    return {
      version: 2,
      language: value.language === "en" ? "en" : "de",
      theme:
        value.theme === "light" || value.theme === "dark"
          ? value.theme
          : "system",
      sudoku,
      minesweeper,
      nonogram,
      nonogramProgress,
      snakeBest: isCount(value.snakeBest) ? value.snakeBest : 0,
      scores,
    };
  } catch {
    return initial;
  }
}

export function writeStore(store: Store): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export function addWin(
  scores: Record<string, Score>,
  key: string,
): Record<string, Score> {
  const old = scores[key] || { wins: 0 };
  return {
    ...scores,
    [key]: {
      wins: old.wins + 1,
    },
  };
}

export function winsFor(scores: Record<string, Score>, prefix: string): number {
  return Object.entries(scores).reduce(
    (total, [key, score]) =>
      total + (key === prefix || key.startsWith(`${prefix}:`) ? score.wins : 0),
    0,
  );
}
