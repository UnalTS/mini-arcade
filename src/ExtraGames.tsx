import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type SetStateAction,
  type TouchEvent,
} from "react";
import { Link } from "react-router";
import type { Store } from "./store";
import { addWin, winsFor } from "./store";
import type { TextKey } from "./i18n";
import {
  curated,
  hintNonogram,
  markNonogram,
  newNonogram,
  undoNonogram,
  type NonogramGame,
  type NonogramMark,
  type NonogramPuzzle,
  type NonogramSize,
} from "./games/nonogram";
import {
  SNAKE_SIZE,
  newSnake,
  snakeInterval,
  snakeStage,
  stepSnake,
  turnSnake,
  type Direction,
} from "./games/snake";

type Props = {
  store: Store;
  setStore: Dispatch<SetStateAction<Store>>;
  t: (key: TextKey) => string;
};
const time = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <Link to="/" className="back-link">
        ← Mini Arcade
      </Link>
      <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl">{title}</h1>
      <p className="mt-2 text-[var(--muted)]">{subtitle}</p>
    </div>
  );
}

export function NonogramPage({ store, setStore, t }: Props) {
  const game = store.nonogram;
  const [mode, setMode] = useState<1 | 2>(1);
  const [zoom, setZoom] = useState(false);
  const [pending, setPending] = useState<NonogramSize | null>(null);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const worker = useRef<Worker | null>(null);
  useEffect(() => {
    if (game?.status !== "playing") return;
    const timer = window.setInterval(
      () =>
        setStore((current) =>
          current.nonogram?.status === "playing"
            ? {
                ...current,
                nonogram: {
                  ...current.nonogram,
                  elapsed: current.nonogram.elapsed + 1,
                },
              }
            : current,
        ),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [game?.status, setStore]);
  useEffect(() => {
    const onHide = () => {
      if (document.hidden)
        setStore((current) =>
          current.nonogram?.status === "playing"
            ? {
                ...current,
                nonogram: { ...current.nonogram, status: "paused" },
              }
            : current,
        );
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [setStore]);
  useEffect(() => () => worker.current?.terminate(), []);
  const start = useCallback(
    (size: NonogramSize) => {
      worker.current?.terminate();
      const progress = store.nonogramProgress[size];
      if (progress < curated[size].length) {
        setStore((current) => ({
          ...current,
          nonogram: newNonogram(curated[size][current.nonogramProgress[size]]),
        }));
        setLoading(false);
      } else {
        setLoading(true);
        const next = new Worker(
          new URL("./games/nonogram.worker.ts", import.meta.url),
          { type: "module" },
        );
        worker.current = next;
        next.onmessage = (event: MessageEvent<NonogramPuzzle>) => {
          setStore((current) => ({
            ...current,
            nonogram: newNonogram(event.data),
          }));
          setLoading(false);
        };
        next.onerror = () => {
          setLoading(false);
          worker.current = null;
        };
        next.postMessage(size);
      }
      setFocused(0);
      setZoom(false);
    },
    [setStore, store.nonogramProgress],
  );
  function request(size: NonogramSize) {
    if (
      game &&
      (game.status === "playing" || game.status === "paused") &&
      game.marks.some(Boolean)
    )
      setPending(size);
    else start(size);
  }
  function change(update: (game: NonogramGame) => NonogramGame) {
    setStore((current) => {
      if (!current.nonogram) return current;
      const previous = current.nonogram;
      const next = update(previous);
      if (next === previous) return current;
      if (next.status !== "won" || previous.status === "won")
        return { ...current, nonogram: next };
      const { size, kind } = next.puzzle;
      const assisted = next.errors || next.hints ? "assisted" : "regular";
      const scores = addWin(
        current.scores,
        `nonogram:${size}:${kind}:${assisted}`,
      );
      return {
        ...current,
        nonogram: next,
        scores,
        nonogramProgress: {
          ...current.nonogramProgress,
          [size]:
            kind === "curated"
              ? Math.min(6, current.nonogramProgress[size] + 1)
              : current.nonogramProgress[size],
        },
      };
    });
  }
  function action(index: number, mark: NonogramMark) {
    if (!game) return;
    change((current) =>
      markNonogram(current, index, current.marks[index] === mark ? 0 : mark),
    );
  }
  function keyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
    size: number,
  ) {
    let next = index;
    if (event.key === "ArrowRight") next = Math.min(size * size - 1, index + 1);
    else if (event.key === "ArrowLeft") next = Math.max(0, index - 1);
    else if (event.key === "ArrowDown")
      next = Math.min(size * size - 1, index + size);
    else if (event.key === "ArrowUp") next = Math.max(0, index - size);
    else if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      action(index, 1);
      return;
    } else if (event.key.toLowerCase() === "x") {
      event.preventDefault();
      action(index, 2);
      return;
    } else return;
    event.preventDefault();
    setFocused(next);
    buttons.current[next]?.focus();
  }
  const size = game?.puzzle.size ?? 5;
  const title = game?.puzzle.name.split(" / ")[store.language === "de" ? 0 : 1];
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <Heading title="Nonogram" subtitle={t("nonogramCard")} />
      <div className="game-layout">
        <div className="game-main">
          {game && (
            <>
              <div className="stats-bar">
                <div>
                  <span>{t("time")}</span>
                  <strong>{time(game.elapsed)}</strong>
                </div>
                <div>
                  <span>{t("errors")}</span>
                  <strong>{game.errors}/3</strong>
                </div>
                <div>
                  <span>{t("hints")}</span>
                  <strong>{game.hints}</strong>
                </div>
              </div>
              <div className="tool-row flex flex-wrap gap-2 pb-4">
                <div className="segmented">
                  <button aria-pressed={mode === 1} onClick={() => setMode(1)}>
                    ■ {t("fill")}
                  </button>
                  <button aria-pressed={mode === 2} onClick={() => setMode(2)}>
                    × {t("cross")}
                  </button>
                </div>
                <button
                  className="button-secondary"
                  onClick={() => change(undoNonogram)}
                  disabled={
                    !game.history.length ||
                    game.status === "won" ||
                    game.status === "lost"
                  }
                >
                  {t("undo")}
                </button>
                <button
                  className="button-secondary"
                  onClick={() => change(hintNonogram)}
                  disabled={
                    game.status === "won" ||
                    game.status === "lost" ||
                    game.status === "paused"
                  }
                >
                  {t("hint")}
                </button>
                <button
                  className="button-secondary"
                  onClick={() =>
                    change((current) => ({
                      ...current,
                      status:
                        current.status === "paused" ? "playing" : "paused",
                    }))
                  }
                  disabled={game.status === "won" || game.status === "lost"}
                >
                  {t(game.status === "paused" ? "resume" : "pause")}
                </button>
                <button
                  className="button-secondary"
                  onClick={() => setZoom(!zoom)}
                  aria-pressed={zoom}
                >
                  {t(zoom ? "fit" : "zoom")}
                </button>
              </div>
              {loading ? (
                <div className="loading-panel">
                  <span className="spinner" />
                  <strong>{t("loading")}</strong>
                </div>
              ) : (
                <div className="ng-viewport">
                  <div
                    className="ng-board"
                    data-zoom={zoom}
                    style={{
                      gridTemplateColumns: zoom
                        ? `96px repeat(${size}, 32px)`
                        : `minmax(52px, 22%) repeat(${size}, minmax(0, 1fr))`,
                    }}
                    role="grid"
                    aria-label="Nonogram"
                  >
                    <span />
                    {game.puzzle.columns.map((clue, x) => (
                      <span className="ng-clue ng-clue-column" key={`col-${x}`}>
                        {clue.map((n, i) => (
                          <span key={i}>{n}</span>
                        ))}
                      </span>
                    ))}
                    {game.puzzle.rows.map((clue, y) => (
                      <FragmentRow
                        key={y}
                        clue={clue}
                        size={size}
                        y={y}
                        marks={game.marks}
                        solution={game.puzzle.solution}
                        focused={focused}
                        buttons={buttons}
                        disabled={
                          game.status === "paused" ||
                          game.status === "won" ||
                          game.status === "lost"
                        }
                        t={t}
                        onFocus={setFocused}
                        onClick={(i) => action(i, mode)}
                        onCross={(i) => action(i, 2)}
                        onKeyDown={keyDown}
                      />
                    ))}
                  </div>
                  {game.status === "paused" && (
                    <div className="ng-paused">{t("pause")}</div>
                  )}
                </div>
              )}
              {(game.status === "won" || game.status === "lost") && (
                <div className="result-panel mt-5" role="status">
                  <div>
                    <span className="eyebrow">
                      {game.status === "won" ? t("won") : t("lost")} ·{" "}
                      {time(game.elapsed)}
                    </span>
                    <h2 className="text-2xl font-bold">
                      {game.status === "won"
                        ? title || t("wonNonogram")
                        : t("lostNonogram")}
                    </h2>
                    <p>
                      {t(
                        game.status === "won" ? "wonNonogram" : "lostNonogram",
                      )}
                    </p>
                  </div>
                  <button
                    className="button-primary"
                    onClick={() =>
                      game.status === "won"
                        ? start(size)
                        : setStore((current) =>
                            current.nonogram
                              ? {
                                  ...current,
                                  nonogram: newNonogram(
                                    current.nonogram.puzzle,
                                  ),
                                }
                              : current,
                          )
                    }
                  >
                    {t(game.status === "won" ? "nextPuzzle" : "retryPuzzle")}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        <aside className="side-panel">
          <label className="field-label" htmlFor="ng-size">
            {t("chooseSize")}
          </label>
          <select
            id="ng-size"
            className="field-select"
            value={size}
            onChange={(event) =>
              request(Number(event.target.value) as NonogramSize)
            }
          >
            {([5, 10, 15] as const).map((n) => (
              <option key={n} value={n}>
                {n}×{n}
              </option>
            ))}
          </select>
          <button
            className="button-primary mt-3 w-full"
            onClick={() => request(size)}
          >
            {t("newGame")} ↗
          </button>
          <details className="rules mt-6">
            <summary>{t("rules")}</summary>
            <p>{t("nonogramRules")}</p>
            <p>{t("nonogramControls")}</p>
          </details>
          <div className="side-divider" />
          <h2 className="text-lg font-bold">{t("localStats")}</h2>
          {([5, 10, 15] as const).map((n) => (
            <div className="score-item" key={n}>
              <strong>
                {n}×{n} · {store.nonogramProgress[n]}/6
              </strong>
              <span>
                {t("wins")}: {winsFor(store.scores, `nonogram:${n}`)}
              </span>
            </div>
          ))}
        </aside>
      </div>
      {pending && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label={t("confirmTitle")}
          >
            <h2 className="text-xl font-bold">{t("confirmTitle")}</h2>
            <p className="mt-3">{t("confirmText")}</p>
            <div className="mt-5 flex gap-2">
              <button
                className="button-secondary"
                onClick={() => setPending(null)}
              >
                {t("cancel")}
              </button>
              <button
                className="button-primary"
                onClick={() => {
                  start(pending);
                  setPending(null);
                }}
              >
                {t("replace")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FragmentRow({
  clue,
  size,
  y,
  marks,
  solution,
  focused,
  buttons,
  disabled,
  t,
  onFocus,
  onClick,
  onCross,
  onKeyDown,
}: {
  clue: number[];
  size: number;
  y: number;
  marks: NonogramMark[];
  solution: boolean[];
  focused: number;
  buttons: React.RefObject<(HTMLButtonElement | null)[]>;
  disabled: boolean;
  t: Props["t"];
  onFocus: (index: number) => void;
  onClick: (index: number) => void;
  onCross: (index: number) => void;
  onKeyDown: (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
    size: number,
  ) => void;
}) {
  return (
    <>
      <span className="ng-clue ng-clue-row">{clue.join(" ")}</span>
      {Array.from({ length: size }, (_, x) => {
        const index = y * size + x,
          mark = marks[index],
          wrong = mark !== 0 && (mark === 1) !== solution[index];
        return (
          <button
            key={index}
            ref={(node) => {
              buttons.current[index] = node;
            }}
            type="button"
            role="gridcell"
            tabIndex={index === focused ? 0 : -1}
            className={`ng-cell ng-mark-${mark} ${wrong ? "ng-wrong" : ""}`}
            aria-label={`${t("row")} ${y + 1}, ${t("column")} ${x + 1}: ${wrong ? t("error") : mark === 1 ? t("fill") : mark === 2 ? t("cross") : t("empty")}`}
            disabled={disabled}
            onFocus={() => onFocus(index)}
            onClick={() => onClick(index)}
            onContextMenu={(event) => {
              event.preventDefault();
              onCross(index);
            }}
            onKeyDown={(event) => onKeyDown(event, index, size)}
          >
            {mark === 2 ? "×" : ""}
          </button>
        );
      })}
    </>
  );
}

export function SnakePage({ store, setStore, t }: Props) {
  const [game, setGame] = useState(newSnake);
  const board = useRef<HTMLDivElement | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (game.status !== "playing") return;
    const timer = window.setInterval(
      () => setGame((current) => stepSnake(current)),
      snakeInterval(game.apples),
    );
    return () => window.clearInterval(timer);
  }, [game.status, game.apples]);
  useEffect(() => {
    if (game.points > store.snakeBest)
      setStore((current) => ({
        ...current,
        snakeBest: Math.max(current.snakeBest, game.points),
      }));
  }, [game.points, store.snakeBest, setStore]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden)
        setGame((current) =>
          current.status === "playing"
            ? { ...current, status: "paused" }
            : current,
        );
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  function direction(value: Direction) {
    setGame((current) => {
      const next = turnSnake(current, value);
      return next.status === "ready" ? { ...next, status: "playing" } : next;
    });
    board.current?.focus();
  }
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== board.current) return;
    const directions: Record<string, Direction> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      w: "up",
      s: "down",
      a: "left",
      d: "right",
    };
    const value = directions[event.key] || directions[event.key.toLowerCase()];
    if (value) {
      event.preventDefault();
      direction(value);
    } else if (event.key === " ") {
      event.preventDefault();
      setGame((current) => ({
        ...current,
        status:
          current.status === "playing"
            ? "paused"
            : current.status === "paused"
              ? "playing"
              : current.status,
      }));
    }
  }
  function touchEnd(event: TouchEvent<HTMLDivElement>) {
    if (!touch.current) return;
    const dx = event.changedTouches[0].clientX - touch.current.x,
      dy = event.changedTouches[0].clientY - touch.current.y;
    touch.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    direction(
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? "right"
          : "left"
        : dy > 0
          ? "down"
          : "up",
    );
  }
  const bodyOrder = new Map(game.body.map((cell, order) => [cell, order]));
  const bodyPath = [...game.body]
    .reverse()
    .map(
      (cell, index) =>
        `${index === 0 ? "M" : "L"} ${(cell % SNAKE_SIZE) + 0.5} ${Math.floor(cell / SNAKE_SIZE) + 0.5}`,
    )
    .join(" ");
  const head = game.body[0];
  const headX = (head % SNAKE_SIZE) + 0.5;
  const headY = Math.floor(head / SNAKE_SIZE) + 0.5;
  const tail = game.body[game.body.length - 1];
  const tailPrevious = game.body[game.body.length - 2];
  const tailX = (tail % SNAKE_SIZE) + 0.5;
  const tailY = Math.floor(tail / SNAKE_SIZE) + 0.5;
  const tailDirection = {
    x: tailX - ((tailPrevious % SNAKE_SIZE) + 0.5),
    y: tailY - (Math.floor(tailPrevious / SNAKE_SIZE) + 0.5),
  };
  const tailTip = {
    x: tailX + tailDirection.x * 0.56,
    y: tailY + tailDirection.y * 0.56,
  };
  const tailBase = {
    x: tailX - tailDirection.x * 0.2,
    y: tailY - tailDirection.y * 0.2,
  };
  const tailPerpendicular = { x: -tailDirection.y, y: tailDirection.x };
  const facing = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  }[game.direction];
  const eyes = [-1, 1].map((side) => ({
    x: headX + facing.x * 0.08 - facing.y * 0.14 * side,
    y: headY + facing.y * 0.08 + facing.x * 0.14 * side,
  }));
  const mouthStart = {
    x: headX + facing.x * 0.27 - facing.y * 0.095,
    y: headY + facing.y * 0.27 + facing.x * 0.095,
  };
  const mouthEnd = {
    x: headX + facing.x * 0.27 + facing.y * 0.095,
    y: headY + facing.y * 0.27 - facing.x * 0.095,
  };
  const mouthTip = {
    x: headX + facing.x * 0.4,
    y: headY + facing.y * 0.4,
  };
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <Heading title="Snake" subtitle={t("snakeCard")} />
      <div className="game-layout">
        <div className="game-main">
          <div className="stats-bar">
            <div>
              <span>{t("points")}</span>
              <strong>{game.points}</strong>
            </div>
            <div>
              <span>{t("apples")}</span>
              <strong>{game.apples}</strong>
            </div>
            <div>
              <span>{t("record")}</span>
              <strong>{store.snakeBest}</strong>
            </div>
          </div>
          <div
            ref={board}
            className="snake-board"
            role="application"
            tabIndex={0}
            aria-label="Snake"
            onKeyDown={keyDown}
            onTouchStart={(event) => {
              touch.current = {
                x: event.touches[0].clientX,
                y: event.touches[0].clientY,
              };
            }}
            onTouchEnd={touchEnd}
          >
            {Array.from({ length: SNAKE_SIZE * SNAKE_SIZE }, (_, index) => {
              const order = bodyOrder.get(index);
              const segment = order !== undefined;
              return (
                <span
                  key={index}
                  aria-hidden="true"
                  className={`snake-cell ${segment ? `snake-segment ${order === 0 ? "snake-head" : order === game.body.length - 1 ? "snake-tail" : "snake-body"}` : index === game.food ? "snake-food" : ""}`}
                />
              );
            })}
            <svg
              aria-hidden="true"
              className="snake-body-art"
              viewBox={`0 0 ${SNAKE_SIZE} ${SNAKE_SIZE}`}
              preserveAspectRatio="none"
            >
              <path
                d={`M ${tailTip.x} ${tailTip.y} L ${tailBase.x + tailPerpendicular.x * 0.32} ${tailBase.y + tailPerpendicular.y * 0.32} L ${tailBase.x - tailPerpendicular.x * 0.32} ${tailBase.y - tailPerpendicular.y * 0.32} Z`}
                fill="#72d94d"
                stroke="#17452f"
                strokeWidth="0.09"
                strokeLinejoin="round"
              />
              <path
                d={bodyPath}
                fill="none"
                stroke="#17452f"
                strokeWidth="0.98"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={bodyPath}
                fill="none"
                stroke="#72d94d"
                strokeWidth="0.73"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {game.body.slice(1, -1).map((cell, index) =>
                index % 2 === 0 ? (
                  <circle
                    key={cell}
                    cx={(cell % SNAKE_SIZE) + 0.5}
                    cy={Math.floor(cell / SNAKE_SIZE) + 0.5}
                    r="0.11"
                    fill="#b5ef72"
                    stroke="#347b3d"
                    strokeWidth="0.035"
                  />
                ) : null,
              )}
              <circle
                cx={headX}
                cy={headY}
                r="0.47"
                fill="#94e94e"
                stroke="#17452f"
                strokeWidth="0.09"
              />
              {eyes.map((eye, index) => (
                <g key={index}>
                  <circle
                    cx={eye.x}
                    cy={eye.y}
                    r="0.17"
                    fill="#fffdf2"
                    stroke="#17452f"
                    strokeWidth="0.035"
                  />
                  <circle
                    cx={eye.x + facing.x * 0.055}
                    cy={eye.y + facing.y * 0.055}
                    r="0.075"
                    fill="#173426"
                  />
                </g>
              ))}
              <path
                d={`M ${mouthStart.x} ${mouthStart.y} Q ${mouthTip.x} ${mouthTip.y} ${mouthEnd.x} ${mouthEnd.y}`}
                fill="none"
                stroke="#17452f"
                strokeWidth="0.04"
                strokeLinecap="round"
              />
            </svg>
            {game.status !== "playing" && (
              <div className="snake-overlay">
                <strong>
                  {game.status === "ready"
                    ? t("snake")
                    : game.status === "paused"
                      ? t("pause")
                      : game.status === "won"
                        ? t("won")
                        : t("lost")}
                </strong>
                <button
                  className="button-primary"
                  onClick={() => {
                    setGame((current) =>
                      current.status === "ready" || current.status === "paused"
                        ? { ...current, status: "playing" }
                        : { ...newSnake(), status: "playing" },
                    );
                    board.current?.focus();
                  }}
                >
                  {game.status === "ready"
                    ? t("start")
                    : game.status === "paused"
                      ? t("resume")
                      : t("again")}
                </button>
              </div>
            )}
          </div>
          <div className="snake-pad" aria-label={t("snakeControls")}>
            {(["up", "left", "down", "right"] as const).map((value) => (
              <button
                key={value}
                className="button-secondary"
                aria-label={t(value)}
                onClick={() => direction(value)}
              >
                {{ up: "↑", left: "←", down: "↓", right: "→" }[value]}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-[var(--muted)]" aria-live="polite">
            {game.status === "lost"
              ? t("lostSnake")
              : `${t("points")}: ${game.points} · ${t("apples")}: ${game.apples}`}
          </p>
        </div>
        <aside className="side-panel">
          <button
            className="button-primary w-full"
            onClick={() => {
              setGame(newSnake());
              board.current?.focus();
            }}
          >
            {t("newGame")}
          </button>
          <button
            className="button-secondary mt-3 w-full"
            disabled={
              game.status === "ready" ||
              game.status === "lost" ||
              game.status === "won"
            }
            onClick={() =>
              setGame((current) => ({
                ...current,
                status: current.status === "paused" ? "playing" : "paused",
              }))
            }
          >
            {t(game.status === "paused" ? "resume" : "pause")}
          </button>
          <details className="rules mt-6">
            <summary>{t("rules")}</summary>
            <p>{t("snakeRules")}</p>
            <p>{t("snakeControls")}</p>
          </details>
          <div className="side-divider" />
          <h2 className="text-lg font-bold">{t("localStats")}</h2>
          <p>
            {t("record")}: {store.snakeBest}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {t("mode")}: {snakeStage(game.apples) + 1} ·{" "}
            {snakeInterval(game.apples)} ms
          </p>
        </aside>
      </div>
    </div>
  );
}
