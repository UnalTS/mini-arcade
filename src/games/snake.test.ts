import { describe, expect, it } from "vitest";
import {
  newSnake,
  snakeFood,
  snakeInterval,
  stepSnake,
  turnSnake,
  type SnakeGame,
} from "./snake";

describe("Snake", () => {
  it("speeds up gently and stops at 80 ms", () => {
    expect(snakeInterval(0)).toBe(180);
    expect(snakeInterval(4)).toBe(170);
    expect(snakeInterval(100)).toBe(80);
  });
  it("never spawns food on its body", () => {
    const body = [0, 1, 2];
    expect(body).not.toContain(snakeFood(body, () => 0));
  });
  it("rejects reverse turns and moves one square per step", () => {
    let game: SnakeGame = { ...newSnake(() => 0), status: "playing" };
    expect(turnSnake(game, "left")).toBe(game);
    expect(turnSnake(game, "right")).toBe(game);
    game = stepSnake(game);
    expect(game.body).toEqual([211, 210, 209]);
  });
  it("grows and scores according to speed", () => {
    const game = {
      ...newSnake(() => 0),
      food: 211,
      status: "playing" as const,
    };
    const next = stepSnake(game, () => 0);
    expect(next.body).toHaveLength(4);
    expect(next.apples).toBe(1);
    expect(next.points).toBe(10);
    const faster = stepSnake({ ...game, apples: 4, points: 40 });
    expect(faster.points).toBe(60);
  });
  it("detects wall collision", () => {
    const game = {
      ...newSnake(),
      body: [19, 18, 17],
      status: "playing" as const,
    };
    expect(stepSnake(game).status).toBe("lost");
  });
  it("allows the vacating tail but detects a body collision", () => {
    const base = {
      ...newSnake(),
      body: [210, 209, 189, 190],
      direction: "up" as const,
      food: 0,
      status: "playing" as const,
    };
    expect(stepSnake(base).status).toBe("playing");
    expect(stepSnake({ ...base, body: [210, 190, 189, 209] }).status).toBe(
      "lost",
    );
  });
});
