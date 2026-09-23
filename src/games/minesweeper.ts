export type MineLevel = "beginner" | "intermediate" | "expert";
export type MineStatus = "ready" | "playing" | "won" | "lost";
export type MineCell = {
  mine: boolean;
  nearby: number;
  revealed: boolean;
  flagged: boolean;
};
export type MineGame = {
  level: MineLevel;
  cells: MineCell[];
  status: MineStatus;
  elapsed: number;
  started: boolean;
};

export const MINE_LEVELS: Record<
  MineLevel,
  { width: number; height: number; mines: number }
> = {
  beginner: { width: 9, height: 9, mines: 10 },
  intermediate: { width: 16, height: 16, mines: 40 },
  expert: { width: 30, height: 16, mines: 99 },
};

export function neighbors(
  index: number,
  width: number,
  height: number,
): number[] {
  const x = index % width;
  const y = Math.floor(index / width);
  const result: number[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height)
        result.push(ny * width + nx);
    }
  return result;
}

export function adjacentMineCount(
  cells: MineCell[],
  index: number,
  width: number,
  height: number,
): number {
  return neighbors(index, width, height).filter((other) => cells[other].mine)
    .length;
}

export function newMineGame(level: MineLevel): MineGame {
  const { width, height } = MINE_LEVELS[level];
  return {
    level,
    cells: Array.from({ length: width * height }, () => ({
      mine: false,
      nearby: 0,
      revealed: false,
      flagged: false,
    })),
    status: "ready",
    elapsed: 0,
    started: false,
  };
}

export function placeMines(
  game: MineGame,
  first: number,
  random = Math.random,
): MineCell[] {
  const { width, height, mines } = MINE_LEVELS[game.level];
  const safe = new Set([first, ...neighbors(first, width, height)]);
  const candidates = Array.from(
    { length: width * height },
    (_, index) => index,
  ).filter((index) => !safe.has(index));
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const cells = game.cells.map((cell) => ({ ...cell }));
  for (const index of candidates.slice(0, mines)) cells[index].mine = true;
  cells.forEach((cell, index) => {
    cell.nearby = adjacentMineCount(cells, index, width, height);
  });
  return cells;
}

function finish(cells: MineCell[], level: MineLevel): MineStatus {
  const { mines } = MINE_LEVELS[level];
  return cells.filter((cell) => cell.revealed).length === cells.length - mines
    ? "won"
    : "playing";
}

function flood(
  cells: MineCell[],
  start: number,
  width: number,
  height: number,
) {
  const queue = [start];
  const seen = new Set<number>();
  while (queue.length) {
    const index = queue.pop()!;
    if (seen.has(index)) continue;
    seen.add(index);
    const cell = cells[index];
    if (cell.flagged || cell.revealed || cell.mine) continue;
    cell.nearby = adjacentMineCount(cells, index, width, height);
    cell.revealed = true;
    if (cell.nearby === 0) queue.push(...neighbors(index, width, height));
  }
}

export function revealMine(
  game: MineGame,
  index: number,
  random = Math.random,
): MineGame {
  if (
    game.status === "won" ||
    game.status === "lost" ||
    !game.cells[index] ||
    game.cells[index].flagged ||
    game.cells[index].revealed
  )
    return game;
  const { width, height } = MINE_LEVELS[game.level];
  const cells = game.started
    ? game.cells.map((cell) => ({ ...cell }))
    : placeMines(game, index, random);
  if (cells[index].mine) {
    cells[index].revealed = true;
    return { ...game, cells, started: true, status: "lost" };
  }
  flood(cells, index, width, height);
  return { ...game, cells, started: true, status: finish(cells, game.level) };
}

export function toggleFlag(game: MineGame, index: number): MineGame {
  if (
    game.status === "won" ||
    game.status === "lost" ||
    !game.cells[index] ||
    game.cells[index].revealed
  )
    return game;
  const cells = game.cells.map((cell) => ({ ...cell }));
  cells[index].flagged = !cells[index].flagged;
  return { ...game, cells };
}

export function chordMine(game: MineGame, index: number): MineGame {
  if (
    game.status !== "playing" ||
    !game.cells[index]?.revealed ||
    game.cells[index].nearby === 0
  )
    return game;
  const { width, height } = MINE_LEVELS[game.level];
  const adjacent = neighbors(index, width, height);
  if (
    adjacent.filter((other) => game.cells[other].flagged).length !==
    adjacentMineCount(game.cells, index, width, height)
  )
    return game;
  const cells = game.cells.map((cell) => ({ ...cell }));
  let hitMine = false;
  for (const other of adjacent) {
    if (cells[other].flagged || cells[other].revealed) continue;
    if (cells[other].mine) {
      cells[other].revealed = true;
      hitMine = true;
    } else flood(cells, other, width, height);
  }
  return {
    ...game,
    cells,
    status: hitMine ? "lost" : finish(cells, game.level),
  };
}
