export type NonogramSize = 5 | 10 | 15;
export type NonogramMark = 0 | 1 | 2;
export type NonogramStatus = "ready" | "playing" | "paused" | "won" | "lost";
export type NonogramPuzzle = {
  id: string;
  size: NonogramSize;
  kind: "curated" | "generated";
  name: string;
  solution: boolean[];
  rows: number[][];
  columns: number[][];
};
export type NonogramGame = {
  puzzle: NonogramPuzzle;
  marks: NonogramMark[];
  history: NonogramMark[][];
  errors: number;
  hints: number;
  elapsed: number;
  status: NonogramStatus;
};

// Each row is an original miniature drawing; the clues are derived, never typed by hand.
const art: Record<NonogramSize, { name: string; rows: string[] }[]> = {
  5: [
    {
      name: "Herz / Heart",
      rows: [".#.#.", "#####", "#####", ".###.", "..#.."],
    },
    {
      name: "Haus / House",
      rows: ["..#..", ".###.", "#####", "#...#", "#####"],
    },
    {
      name: "Baum / Tree",
      rows: ["..#..", ".###.", "#####", "..#..", "..#.."],
    },
    {
      name: "Fisch / Fish",
      rows: ["#....", "#.##.", "#####", "#.##.", "#...."],
    },
    {
      name: "Blume / Flower",
      rows: [".#.#.", "..#..", ".###.", "..#..", ".#.#."],
    },
    {
      name: "Sonne / Sun",
      rows: ["#.#.#", ".###.", "#####", ".###.", "#.#.#"],
    },
  ],
  10: [
    {
      name: "Katze / Cat",
      rows: [
        "##......##",
        "###....###",
        "##########",
        "##########",
        "##.####.##",
        "##########",
        ".########.",
        "..######..",
        "..######..",
        "...####...",
      ],
    },
    {
      name: "Pilz / Mushroom",
      rows: [
        "...####...",
        "..######..",
        ".########.",
        "##########",
        "##########",
        "..######..",
        "...####...",
        "...####...",
        "...####...",
        "..######..",
      ],
    },
    {
      name: "Boot / Boat",
      rows: [
        ".....#....",
        "....##....",
        "...###....",
        "..####....",
        ".#####....",
        "##########",
        ".########.",
        "..######..",
        "...####...",
        "..........",
      ],
    },
    {
      name: "Schmetterling / Butterfly",
      rows: [
        "##..##..##",
        "###.##.###",
        "##########",
        ".########.",
        "...####...",
        "...####...",
        ".########.",
        "##########",
        "###.##.###",
        "##..##..##",
      ],
    },
    {
      name: "Apfel / Apple",
      rows: [
        ".....##...",
        "....###...",
        "..######..",
        ".########.",
        "##########",
        "##########",
        "##########",
        ".########.",
        "..######..",
        "...####...",
      ],
    },
    {
      name: "Rakete / Rocket",
      rows: [
        "....##....",
        "...####...",
        "...####...",
        "..######..",
        "..######..",
        "..######..",
        ".####.###.",
        "##########",
        "##.####.##",
        "#..###...#",
      ],
    },
  ],
  15: [
    {
      name: "Eule / Owl",
      rows: [
        "###.........###",
        "####.......####",
        "###############",
        "###############",
        "###..#####..###",
        "##....###....##",
        "##..#..#..#..##",
        "###...###...###",
        "###############",
        ".#############.",
        "..###########..",
        "...#########...",
        "....#######....",
        ".....#####.....",
        "......###......",
      ],
    },
    {
      name: "Leuchtturm / Lighthouse",
      rows: [
        "......###......",
        ".....#####.....",
        "....#######....",
        ".....#####.....",
        "......###......",
        ".....#####.....",
        ".....#####.....",
        ".....#####.....",
        ".....#####.....",
        ".....#####.....",
        ".....#####.....",
        "....#######....",
        "...#########...",
        "..###########..",
        "###############",
      ],
    },
    {
      name: "Kaktus / Cactus",
      rows: [
        "......###......",
        "......###......",
        "......###......",
        "..##..###......",
        "..##..###..##..",
        "..##..###..##..",
        "..###.###..##..",
        "...######..##..",
        "....#########..",
        "......######...",
        "......###......",
        "......###......",
        "......###......",
        "....#######....",
        "...#########...",
      ],
    },
    {
      name: "Roboter / Robot",
      rows: [
        ".......#.......",
        ".......#.......",
        "..###########..",
        "..###########..",
        "..##..###..##..",
        "..##..###..##..",
        "..###########..",
        "..###.....###..",
        "..###########..",
        "..###########..",
        "####.#####.####",
        "####.#####.####",
        "....#######....",
        "....##...##....",
        "....##...##....",
      ],
    },
    {
      name: "Fuchs / Fox",
      rows: [
        "##...........##",
        "###.........###",
        "####.......####",
        "#####.....#####",
        "###############",
        "###############",
        "###..#####..###",
        "##....###....##",
        "###...###...###",
        ".#############.",
        "..###########..",
        "...#########...",
        "....#######....",
        ".....#####.....",
        "......###......",
      ],
    },
    {
      name: "Tasse / Cup",
      rows: [
        "...............",
        ".##########....",
        ".##########....",
        ".##########.##.",
        ".##########.##.",
        ".##########.##.",
        ".##########.##.",
        ".##########.##.",
        ".##########.##.",
        ".###########.#.",
        "..###########..",
        "...#########...",
        "....#######....",
        "..###########..",
        ".#############.",
      ],
    },
  ],
};

export function runs(line: boolean[]): number[] {
  const result: number[] = [];
  let length = 0;
  for (const filled of line) {
    if (filled) length++;
    else if (length) {
      result.push(length);
      length = 0;
    }
  }
  if (length) result.push(length);
  return result.length ? result : [0];
}

export function makePuzzle(
  id: string,
  size: NonogramSize,
  kind: NonogramPuzzle["kind"],
  name: string,
  solution: boolean[],
): NonogramPuzzle {
  const rows = Array.from({ length: size }, (_, y) =>
    runs(solution.slice(y * size, (y + 1) * size)),
  );
  const columns = Array.from({ length: size }, (_, x) =>
    runs(Array.from({ length: size }, (_, y) => solution[y * size + x])),
  );
  return { id, size, kind, name, solution, rows, columns };
}

export const curated: Record<NonogramSize, NonogramPuzzle[]> = {
  5: [],
  10: [],
  15: [],
};
for (const size of [5, 10, 15] as const) {
  curated[size] = art[size].map(({ name, rows }, index) =>
    makePuzzle(
      `${size}-${index}`,
      size,
      "curated",
      name,
      rows
        .join("")
        .split("")
        .map((cell) => cell === "#"),
    ),
  );
}

function lineOptions(length: number, clue: number[]): boolean[][] {
  if (clue.length === 1 && clue[0] === 0) return [Array(length).fill(false)];
  const options: boolean[][] = [];
  const search = (part: number, start: number, line: boolean[]) => {
    if (part === clue.length) {
      options.push(line);
      return;
    }
    const rest = clue.slice(part + 1).reduce((sum, n) => sum + n + 1, 0);
    for (
      let position = start;
      position + clue[part] + rest <= length;
      position++
    ) {
      const next = [...line];
      for (let i = position; i < position + clue[part]; i++) next[i] = true;
      search(part + 1, position + clue[part] + 1, next);
    }
  };
  search(0, 0, Array(length).fill(false));
  return options;
}

// A puzzle passes only if line consensus alone determines every square.
// Every forced square is shared by all valid solutions, so a fully resolved board is unique.
export function solveByLogic(puzzle: NonogramPuzzle): boolean[] | null {
  const { size } = puzzle;
  const known = Array<boolean | null>(size * size).fill(null);
  const lines = [
    ...puzzle.rows.map((clue, y) => ({
      clue,
      indices: Array.from({ length: size }, (_, x) => y * size + x),
    })),
    ...puzzle.columns.map((clue, x) => ({
      clue,
      indices: Array.from({ length: size }, (_, y) => y * size + x),
    })),
  ];
  const options = lines.map(({ clue }) => lineOptions(size, clue));
  let changed = true;
  while (changed) {
    changed = false;
    for (let l = 0; l < lines.length; l++) {
      const { indices } = lines[l];
      options[l] = options[l].filter((option) =>
        indices.every(
          (index, pos) => known[index] === null || known[index] === option[pos],
        ),
      );
      if (!options[l].length) return null;
      for (let pos = 0; pos < size; pos++) {
        const value = options[l][0][pos];
        if (
          known[indices[pos]] === null &&
          options[l].every((option) => option[pos] === value)
        ) {
          known[indices[pos]] = value;
          changed = true;
        }
      }
    }
  }
  return known.every((cell) => cell !== null) ? (known as boolean[]) : null;
}

export function generatePuzzle(
  size: NonogramSize,
  random = Math.random,
): NonogramPuzzle | null {
  for (let attempt = 0; attempt < 300; attempt++) {
    const solution = Array.from({ length: size * size }, () => random() < 0.48);
    const filled = solution.filter(Boolean).length;
    if (filled < size * size * 0.3 || filled > size * size * 0.7) continue;
    const puzzle = makePuzzle(
      `generated-${size}-${Math.floor(random() * 1e12)}`,
      size,
      "generated",
      "",
      solution,
    );
    if (solveByLogic(puzzle)?.every((cell, index) => cell === solution[index]))
      return puzzle;
  }
  return null;
}

export function newNonogram(puzzle: NonogramPuzzle): NonogramGame {
  return {
    puzzle,
    marks: Array(puzzle.size * puzzle.size).fill(0),
    history: [],
    errors: 0,
    hints: 0,
    elapsed: 0,
    status: "ready",
  };
}

export function markNonogram(
  game: NonogramGame,
  index: number,
  mark: NonogramMark,
): NonogramGame {
  if (
    game.status === "won" ||
    game.status === "lost" ||
    game.status === "paused" ||
    index < 0 ||
    index >= game.marks.length
  )
    return game;
  if (game.marks[index] === mark) return game;
  const marks = [...game.marks];
  marks[index] = mark;
  const wrong = mark !== 0 && (mark === 1) !== game.puzzle.solution[index];
  const errors = game.errors + Number(wrong);
  const won = marks.every(
    (cell, i) => (cell === 1) === game.puzzle.solution[i],
  );
  return {
    ...game,
    marks,
    errors,
    history: [...game.history.slice(-199), game.marks],
    status: errors >= 3 ? "lost" : won ? "won" : "playing",
  };
}

export function undoNonogram(game: NonogramGame): NonogramGame {
  if (game.status === "won" || game.status === "lost" || !game.history.length)
    return game;
  return {
    ...game,
    marks: game.history.at(-1)!,
    history: game.history.slice(0, -1),
  };
}

export function hintNonogram(
  game: NonogramGame,
  random = Math.random,
): NonogramGame {
  if (
    game.status === "won" ||
    game.status === "lost" ||
    game.status === "paused"
  )
    return game;
  const candidates = game.marks
    .map((mark, i) => (mark !== (game.puzzle.solution[i] ? 1 : 2) ? i : -1))
    .filter((i) => i >= 0);
  if (!candidates.length) return game;
  const index = candidates[Math.floor(random() * candidates.length)];
  const marks = [...game.marks];
  marks[index] = game.puzzle.solution[index] ? 1 : 2;
  const won = marks.every(
    (cell, i) => (cell === 1) === game.puzzle.solution[i],
  );
  return {
    ...game,
    marks,
    hints: game.hints + 1,
    history: [...game.history.slice(-199), game.marks],
    status: won ? "won" : "playing",
  };
}
