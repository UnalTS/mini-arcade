import type { Language } from "./i18n";
import type { MineGame } from "./games/minesweeper";
import {
  adjacentMineCount,
  MINE_LEVELS,
  newMineGame,
} from "./games/minesweeper";
import type { SudokuGame } from "./games/sudoku";

export type Theme = "system" | "light" | "dark";
export type Score = { wins: number; best: number | null };
export type Store = {
  version: 1;
  language: Language;
  theme: Theme;
  sudoku: SudokuGame | null;
  minesweeper: MineGame | null;
  scores: Record<string, Score>;
};
const key = "mini-arcade-v1";
const initialLanguage = (): Language =>
  typeof navigator !== "undefined" &&
  navigator.language.toLowerCase().startsWith("en")
    ? "en"
    : "de";
export const emptyStore = (): Store => ({
  version: 1,
  language: initialLanguage(),
  theme: "system",
  sudoku: null,
  minesweeper: newMineGame("beginner"),
  scores: {},
});
const isArray = (value: unknown, size: number) =>
  Array.isArray(value) && value.length === size;
const isCount = (value: unknown) =>
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

export function readStore(): Store {
  const initial = emptyStore();
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) || "null");
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("version" in parsed) ||
      parsed.version !== 1
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
    const scores =
      value.scores && typeof value.scores === "object"
        ? Object.fromEntries(
            Object.entries(value.scores).filter(
              ([, score]) =>
                score &&
                isCount(score.wins) &&
                (score.best === null || isCount(score.best)),
            ),
          )
        : {};
    return {
      version: 1,
      language: value.language === "en" ? "en" : "de",
      theme:
        value.theme === "light" || value.theme === "dark"
          ? value.theme
          : "system",
      sudoku,
      minesweeper,
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
  elapsed: number,
): Record<string, Score> {
  const old = scores[key] || { wins: 0, best: null };
  return {
    ...scores,
    [key]: {
      wins: old.wins + 1,
      best: old.best === null ? elapsed : Math.min(old.best, elapsed),
    },
  };
}
