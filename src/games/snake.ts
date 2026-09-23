export type Direction = "up" | "down" | "left" | "right";
export type SnakeStatus = "ready" | "playing" | "paused" | "lost" | "won";
export type SnakeGame = {
  body: number[];
  food: number | null;
  direction: Direction;
  queued: Direction | null;
  apples: number;
  points: number;
  status: SnakeStatus;
};
export const SNAKE_SIZE = 20;
const opposite: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};
export function snakeStage(apples: number) {
  return Math.min(10, Math.floor(apples / 4));
}
export function snakeInterval(apples: number) {
  return 180 - 10 * snakeStage(apples);
}
export function snakeFood(body: number[], random = Math.random): number | null {
  const occupied = new Set(body);
  const free = Array.from(
    { length: SNAKE_SIZE * SNAKE_SIZE },
    (_, i) => i,
  ).filter((i) => !occupied.has(i));
  return free.length ? free[Math.floor(random() * free.length)] : null;
}
export function newSnake(random = Math.random): SnakeGame {
  const body = [210, 209, 208];
  return {
    body,
    food: snakeFood(body, random),
    direction: "right",
    queued: null,
    apples: 0,
    points: 0,
    status: "ready",
  };
}
export function turnSnake(game: SnakeGame, direction: Direction): SnakeGame {
  if (game.status !== "playing" && game.status !== "ready") return game;
  if (
    direction === game.direction ||
    direction === opposite[game.direction] ||
    game.queued
  )
    return game;
  return { ...game, queued: direction };
}
export function stepSnake(game: SnakeGame, random = Math.random): SnakeGame {
  if (game.status !== "playing") return game;
  const direction = game.queued ?? game.direction;
  const head = game.body[0];
  const x = head % SNAKE_SIZE,
    y = Math.floor(head / SNAKE_SIZE);
  const nextX = x + (direction === "left" ? -1 : direction === "right" ? 1 : 0);
  const nextY = y + (direction === "up" ? -1 : direction === "down" ? 1 : 0);
  if (nextX < 0 || nextX >= SNAKE_SIZE || nextY < 0 || nextY >= SNAKE_SIZE)
    return { ...game, status: "lost", queued: null };
  const next = nextY * SNAKE_SIZE + nextX;
  const ate = next === game.food;
  const occupied = ate ? game.body : game.body.slice(0, -1);
  if (occupied.includes(next)) return { ...game, status: "lost", queued: null };
  const body = [next, ...(ate ? game.body : game.body.slice(0, -1))];
  const apples = game.apples + Number(ate);
  const points = game.points + (ate ? 10 * (1 + snakeStage(game.apples)) : 0);
  const food = ate ? snakeFood(body, random) : game.food;
  return {
    ...game,
    body,
    food,
    apples,
    points,
    direction,
    queued: null,
    status: food === null ? "won" : "playing",
  };
}
