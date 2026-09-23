export type SudokuLevel = "easy" | "medium" | "hard";
export type SudokuStatus = "ready" | "playing" | "paused" | "won" | "lost";
export type SudokuMove = { values: number[]; notes: number[][] };
export type SudokuGame = {
  level: SudokuLevel;
  puzzle: number[];
  solution: number[];
  values: number[];
  notes: number[][];
  history: SudokuMove[];
  errors: number;
  hints: number;
  elapsed: number;
  status: SudokuStatus;
};

const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const emptyNotes = () => Array.from({ length: 81 }, () => [] as number[]);
const peers = Array.from({ length: 81 }, (_, index) => {
  const row = Math.floor(index / 9),
    col = index % 9;
  const boxRow = Math.floor(row / 3) * 3,
    boxCol = Math.floor(col / 3) * 3;
  const result = new Set<number>();
  for (let k = 0; k < 9; k++) {
    result.add(row * 9 + k);
    result.add(k * 9 + col);
  }
  for (let r = boxRow; r < boxRow + 3; r++)
    for (let c = boxCol; c < boxCol + 3; c++) result.add(r * 9 + c);
  result.delete(index);
  return [...result];
});
const units: number[][] = [];
for (let k = 0; k < 9; k++) {
  units.push(Array.from({ length: 9 }, (_, n) => k * 9 + n));
  units.push(Array.from({ length: 9 }, (_, n) => n * 9 + k));
  units.push(
    Array.from(
      { length: 9 },
      (_, n) =>
        (Math.floor(k / 3) * 3 + Math.floor(n / 3)) * 9 + (k % 3) * 3 + (n % 3),
    ),
  );
}

export function candidates(board: number[], index: number): number[] {
  if (board[index]) return [];
  const used = new Set(peers[index].map((other) => board[other]));
  return digits.filter((digit) => !used.has(digit));
}

export function countSolutions(
  board: number[],
  limit = 2,
): { count: number; solution: number[] | null } {
  const work = [...board];
  let count = 0,
    solution: number[] | null = null;
  const search = () => {
    if (count >= limit) return;
    let next = -1,
      options: number[] = [];
    for (let index = 0; index < 81; index++) {
      if (work[index]) continue;
      const current = candidates(work, index);
      if (!current.length) return;
      if (next < 0 || current.length < options.length) {
        next = index;
        options = current;
      }
    }
    if (next < 0) {
      count++;
      solution = [...work];
      return;
    }
    for (const value of options) {
      work[next] = value;
      search();
      work[next] = 0;
      if (count >= limit) return;
    }
  };
  // A fully filled but invalid board must not count as a solution.
  if (
    units.some((unit) => {
      const values = unit.map((index) => work[index]).filter(Boolean);
      return new Set(values).size !== values.length;
    })
  )
    return { count: 0, solution: null };
  search();
  return { count, solution };
}

function humanSolve(
  board: number[],
  maxLevel: 1 | 2,
): { solved: boolean; hiddenSingles: number } {
  const work = [...board];
  const excluded = Array.from({ length: 81 }, () => new Set<number>());
  let hiddenSingles = 0;
  for (let pass = 0; pass < 300; pass++) {
    if (work.every(Boolean)) return { solved: true, hiddenSingles };
    const options = work.map((value, index) =>
      value
        ? []
        : candidates(work, index).filter(
            (digit) => !excluded[index].has(digit),
          ),
    );
    if (options.some((set, index) => !work[index] && !set.length))
      return { solved: false, hiddenSingles };
    let changed = false;
    for (let index = 0; index < 81; index++)
      if (!work[index] && options[index].length === 1) {
        work[index] = options[index][0];
        changed = true;
        break;
      }
    if (changed) continue;
    for (const unit of units) {
      for (const digit of digits) {
        const spots = unit.filter(
          (index) => !work[index] && options[index].includes(digit),
        );
        if (spots.length === 1) {
          work[spots[0]] = digit;
          hiddenSingles++;
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
    if (changed) continue;
    if (maxLevel === 1) return { solved: false, hiddenSingles };
    // Locked candidates: a digit restricted to one box within a row/column,
    // or one row/column within a box, can be removed from the other cells.
    for (const unit of units)
      for (const digit of digits) {
        const spots = unit.filter(
          (index) => !work[index] && options[index].includes(digit),
        );
        if (spots.length < 2) continue;
        const groups = [
          {
            same: spots.every(
              (index) =>
                Math.floor(index / 27) === Math.floor(spots[0] / 27) &&
                Math.floor((index % 9) / 3) === Math.floor((spots[0] % 9) / 3),
            ),
            target:
              units[
                (Math.floor(spots[0] / 27) * 3 +
                  Math.floor((spots[0] % 9) / 3)) *
                  3 +
                  2
              ],
          },
          {
            same: spots.every(
              (index) => Math.floor(index / 9) === Math.floor(spots[0] / 9),
            ),
            target: units[Math.floor(spots[0] / 9) * 3],
          },
          {
            same: spots.every((index) => index % 9 === spots[0] % 9),
            target: units[(spots[0] % 9) * 3 + 1],
          },
        ];
        for (const group of groups)
          if (group.same)
            for (const index of group.target) {
              if (
                !unit.includes(index) &&
                !work[index] &&
                options[index].includes(digit) &&
                !excluded[index].has(digit)
              ) {
                excluded[index].add(digit);
                changed = true;
              }
            }
      }
    if (changed) continue;
    // Naked pairs in any row, column or box.
    for (const unit of units) {
      const pairs = unit.filter(
        (index) => !work[index] && options[index].length === 2,
      );
      for (const first of pairs) {
        const matches = pairs.filter(
          (index) => options[index].join() === options[first].join(),
        );
        if (matches.length !== 2) continue;
        for (const index of unit)
          if (!matches.includes(index) && !work[index])
            for (const digit of options[first]) {
              if (
                options[index].includes(digit) &&
                !excluded[index].has(digit)
              ) {
                excluded[index].add(digit);
                changed = true;
              }
            }
      }
    }
    if (!changed) return { solved: false, hiddenSingles };
  }
  return { solved: false, hiddenSingles };
}

export function ratePuzzle(board: number[]): SudokuLevel {
  const singles = humanSolve(board, 1);
  if (singles.solved) return singles.hiddenSingles <= 5 ? "easy" : "medium";
  if (humanSolve(board, 2).solved) return "medium";
  return "hard";
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function solvedBoard(random: () => number): number[] {
  const digitOrder = shuffled(digits, random);
  const bands = shuffled([0, 1, 2], random);
  const stacks = shuffled([0, 1, 2], random);
  const rows = bands.flatMap((band) =>
    shuffled([0, 1, 2], random).map((offset) => band * 3 + offset),
  );
  const cols = stacks.flatMap((stack) =>
    shuffled([0, 1, 2], random).map((offset) => stack * 3 + offset),
  );
  return rows.flatMap((row) =>
    cols.map((col) => digitOrder[(row * 3 + Math.floor(row / 3) + col) % 9]),
  );
}

const fallback: Record<SudokuLevel, string> = {
  easy: "530070000600195000098000060800060003400803001700020006060000280000419005000080079",
  medium:
    "900006028000800053000005700000900517000000084510460030106080000092007000070604890",
  hard: "000000907000420180000705026100904000050000040000507009920108000034059000507000000",
};

export function generateSudoku(
  level: SudokuLevel,
  random = Math.random,
): { puzzle: number[]; solution: number[] } {
  const targets: Record<SudokuLevel, [number, number]> = {
    easy: [39, 45],
    medium: [31, 36],
    hard: [25, 31],
  };
  for (let attempt = 0; attempt < 45; attempt++) {
    const solution = solvedBoard(random);
    const puzzle = [...solution];
    const target =
      targets[level][0] +
      Math.floor(random() * (targets[level][1] - targets[level][0] + 1));
    let remaining = 81;
    for (const index of shuffled(
      Array.from({ length: 81 }, (_, n) => n),
      random,
    )) {
      if (remaining <= target) break;
      const value = puzzle[index];
      puzzle[index] = 0;
      if (countSolutions(puzzle).count !== 1) puzzle[index] = value;
      else remaining--;
    }
    if (remaining <= targets[level][1] && ratePuzzle(puzzle) === level)
      return { puzzle, solution };
  }
  const puzzle = [...fallback[level]].map(Number);
  const result = countSolutions(puzzle);
  if (result.count !== 1 || !result.solution)
    throw new Error("Invalid fallback puzzle");
  if (ratePuzzle(puzzle) !== level)
    throw new Error("Fallback difficulty mismatch");
  return { puzzle, solution: result.solution };
}

export function newSudokuGame(
  level: SudokuLevel,
  puzzle: number[],
  solution: number[],
): SudokuGame {
  return {
    level,
    puzzle,
    solution,
    values: [...puzzle],
    notes: emptyNotes(),
    history: [],
    errors: 0,
    hints: 0,
    elapsed: 0,
    status: "ready",
  };
}

function snapshot(game: SudokuGame): SudokuMove {
  return {
    values: [...game.values],
    notes: game.notes.map((note) => [...note]),
  };
}

export function enterSudoku(
  game: SudokuGame,
  index: number,
  value: number,
  pencil = false,
): SudokuGame {
  if (
    game.status === "won" ||
    game.status === "lost" ||
    game.status === "paused" ||
    game.puzzle[index] ||
    index < 0 ||
    index > 80 ||
    value < 0 ||
    value > 9
  )
    return game;
  const values = [...game.values];
  const notes = game.notes.map((note) => [...note]);
  if (pencil && value) {
    if (values[index]) return game;
    notes[index] = notes[index].includes(value)
      ? notes[index].filter((note) => note !== value)
      : [...notes[index], value].sort();
  } else {
    if (values[index] === value) return game;
    values[index] = value;
    notes[index] = [];
  }
  const errors =
    game.errors +
    (!pencil && value !== 0 && value !== game.solution[index] ? 1 : 0);
  const won = values.every((entry, at) => entry === game.solution[at]);
  return {
    ...game,
    values,
    notes,
    errors,
    status: errors >= 3 ? "lost" : won ? "won" : "playing",
    history: [...game.history, snapshot(game)].slice(-100),
  };
}

export function undoSudoku(game: SudokuGame): SudokuGame {
  if (
    game.status === "won" ||
    game.status === "lost" ||
    game.status === "paused" ||
    !game.history.length
  )
    return game;
  const previous = game.history[game.history.length - 1];
  return {
    ...game,
    values: previous.values,
    notes: previous.notes,
    history: game.history.slice(0, -1),
  };
}

export function hintSudoku(game: SudokuGame, preferred = -1): SudokuGame {
  if (
    game.status === "won" ||
    game.status === "lost" ||
    game.status === "paused"
  )
    return game;
  const index =
    preferred >= 0 && game.values[preferred] !== game.solution[preferred]
      ? preferred
      : game.values.findIndex((value, at) => value !== game.solution[at]);
  if (index < 0) return game;
  const values = [...game.values];
  const notes = game.notes.map((note) => [...note]);
  values[index] = game.solution[index];
  notes[index] = [];
  return {
    ...game,
    values,
    notes,
    hints: game.hints + 1,
    status: values.every((value, at) => value === game.solution[at])
      ? "won"
      : "playing",
    history: [...game.history, snapshot(game)].slice(-100),
  };
}
