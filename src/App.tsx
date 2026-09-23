import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router";
import { translate, type TextKey } from "./i18n";
import { addWin, readStore, writeStore, type Store, type Theme } from "./store";
import {
  adjacentMineCount,
  chordMine,
  MINE_LEVELS,
  neighbors,
  newMineGame,
  revealMine,
  toggleFlag,
  type MineGame,
  type MineLevel,
} from "./games/minesweeper";
import {
  enterSudoku,
  generateSudoku,
  hintSudoku,
  newSudokuGame,
  undoSudoku,
  type SudokuGame,
  type SudokuLevel,
} from "./games/sudoku";

type ArcadeContext = {
  store: Store;
  setStore: React.Dispatch<React.SetStateAction<Store>>;
  t: (key: TextKey) => string;
};
const Context = createContext<ArcadeContext | null>(null);
const previewMineIndices = new Set([2, 6, 8]);
function useArcade() {
  const value = useContext(Context);
  if (!value) throw new Error("Arcade context missing");
  return value;
}
function formatTime(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
function canContinueSudoku(game: SudokuGame | null) {
  if (!game) return false;
  if (game.status === "playing") return true;
  return (
    game.status === "paused" &&
    (game.history.length > 0 ||
      game.errors > 0 ||
      game.hints > 0 ||
      game.elapsed > 0)
  );
}
function canContinueMinesweeper(game: MineGame | null) {
  return (
    !!game &&
    (game.status === "ready" || game.status === "playing") &&
    (game.started || game.cells.some((cell) => cell.flagged))
  );
}
function randomFromSeed(seed: number) {
  let value = seed;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function Confirm({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useArcade();
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => previous?.focus();
  }, []);
  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-text"
        className="modal-card"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel();
          if (event.key === "Tab") {
            const buttons = [...event.currentTarget.querySelectorAll("button")];
            const first = buttons[0],
              last = buttons[buttons.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <h2 id="confirm-title" className="text-xl font-bold">
          {t("confirmTitle")}
        </h2>
        <p id="confirm-text" className="mt-2 text-[var(--muted)]">
          {t("confirmText")}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelRef}
            className="button-secondary"
            onClick={onCancel}
          >
            {t("cancel")}
          </button>
          <button className="button-primary" onClick={onConfirm}>
            {t("replace")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Header() {
  const { store, setStore, t } = useArcade();
  const location = useLocation();
  return (
    <header className="border-b border-[var(--line)] bg-[var(--surface)]/90">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-3 text-xl font-extrabold tracking-tight"
        >
          <span className="brand-mark" aria-hidden="true">
            ✳
          </span>{" "}
          Mini Arcade
        </Link>
        <nav
          aria-label={t("mainNavigation")}
          className="order-3 flex w-full gap-1 sm:order-2 sm:w-auto"
        >
          {(
            [
              ["/", "home"],
              ["/sudoku", "sudoku"],
              ["/minesweeper", "minesweeper"],
            ] as const
          ).map(([path, label]) => (
            <NavLink
              key={path}
              to={path}
              end
              className={({ isActive }) =>
                `nav-link ${isActive ? "nav-link-active" : ""}`
              }
            >
              {t(label)}
            </NavLink>
          ))}
        </nav>
        <div className="order-2 flex items-center gap-2 sm:order-3">
          <label className="sr-only" htmlFor="language">
            {t("language")}
          </label>
          <select
            id="language"
            className="select-compact"
            value={store.language}
            onChange={(event) =>
              setStore((current) => ({
                ...current,
                language: event.target.value as "de" | "en",
              }))
            }
          >
            <option value="de">DE</option>
            <option value="en">EN</option>
          </select>
          <label className="sr-only" htmlFor="theme">
            {t("theme")}
          </label>
          <select
            id="theme"
            className="select-compact"
            value={store.theme}
            onChange={(event) =>
              setStore((current) => ({
                ...current,
                theme: event.target.value as Theme,
              }))
            }
          >
            <option value="system">{t("system")}</option>
            <option value="light">{t("light")}</option>
            <option value="dark">{t("dark")}</option>
          </select>
        </div>
      </div>
      <span className="sr-only" aria-live="polite">
        {location.pathname === "/"
          ? t("home")
          : location.pathname === "/sudoku"
            ? t("sudoku")
            : t("minesweeper")}
      </span>
    </header>
  );
}

function ScoreLine({ scoreKey }: { scoreKey: string }) {
  const { store, t } = useArcade();
  const score = store.scores[scoreKey];
  return (
    <span className="text-sm text-[var(--muted)]">
      {t("wins")}: {score?.wins ?? 0} · {t("best")}:{" "}
      {score?.best != null ? formatTime(score.best) : "—"}
    </span>
  );
}

function Home() {
  const { store, t } = useArcade();
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <section className="hero-panel mt-8 px-6 py-12 sm:px-12 sm:py-16">
        <span className="eyebrow">✦ {t("eyebrow")}</span>
        <h1 className="mt-5 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          {t("heroTitle")}
        </h1>
        <p className="mt-5 max-w-xl text-lg text-[var(--muted)]">
          {t("heroText")}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="button-primary" to="/sudoku">
            {t("playNow")} <span aria-hidden="true">→</span>
          </Link>
          <Link className="button-secondary" to="/minesweeper">
            Minesweeper <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="tile tile-a">5</div>
          <div className="tile tile-b">✳</div>
          <div className="tile tile-c">8</div>
          <div className="tile tile-d">✦</div>
        </div>
      </section>
      <section className="mt-12" aria-labelledby="games-heading">
        <div className="mb-5">
          <span className="eyebrow">01 / 02</span>
          <h2
            id="games-heading"
            className="mt-2 text-3xl font-bold tracking-tight"
          >
            {t("games")}
          </h2>
          <p className="mt-1 text-[var(--muted)]">{t("gamesText")}</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <article className="game-card">
            <div className="card-visual sudoku-visual" aria-hidden="true">
              <span>1</span>
              <span>4</span>
              <span>8</span>
              <span>6</span>
              <span>9</span>
              <span>2</span>
              <span>3</span>
              <span>7</span>
              <span>5</span>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">Sudoku</h3>
                <span className="pill">01</span>
              </div>
              <p className="mt-2 text-[var(--muted)]">{t("sudokuCard")}</p>
              <div className="mt-4">
                <ScoreLine scoreKey="sudoku:easy:regular" />
              </div>
              <Link to="/sudoku" className="card-link mt-6">
                {canContinueSudoku(store.sudoku) ? t("continue") : t("playNow")}{" "}
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </article>
          <article className="game-card">
            <div className="card-visual mine-visual" aria-hidden="true">
              {Array.from({ length: 9 }, (_, index) => {
                const isMine = previewMineIndices.has(index);
                const count = neighbors(index, 3, 3).filter((neighbor) =>
                  previewMineIndices.has(neighbor),
                ).length;
                return (
                  <span
                    key={index}
                    className={isMine ? "mine-preview-flag" : undefined}
                  >
                    {isMine ? "⚑" : count || ""}
                  </span>
                );
              })}
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">Minesweeper</h3>
                <span className="pill">02</span>
              </div>
              <p className="mt-2 text-[var(--muted)]">{t("mineCard")}</p>
              <div className="mt-4">
                <ScoreLine scoreKey="minesweeper:beginner" />
              </div>
              <Link to="/minesweeper" className="card-link mt-6">
                {canContinueMinesweeper(store.minesweeper)
                  ? t("continue")
                  : t("playNow")}{" "}
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

function Result({
  won,
  text,
  time,
  again,
}: {
  won: boolean;
  text: string;
  time: number;
  again: () => void;
}) {
  const { t } = useArcade();
  return (
    <div className={`result-panel ${won ? "result-won" : ""}`} role="status">
      <div>
        <span className="eyebrow">
          {t("result")} · {formatTime(time)}
        </span>
        <h2 className="mt-1 text-2xl font-bold">{t(won ? "won" : "lost")}</h2>
        <p className="mt-1 text-[var(--muted)]">{text}</p>
      </div>
      <button className="button-primary" onClick={again}>
        {t("again")} <span aria-hidden="true">↗</span>
      </button>
    </div>
  );
}

function GameHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <Link to="/" className="back-link">
        ← Mini Arcade
      </Link>
      <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
        {title}
      </h1>
      <p className="mt-2 text-[var(--muted)]">{subtitle}</p>
    </div>
  );
}

function SudokuPage() {
  const { store, setStore, t } = useArcade();
  const game = store.sudoku;
  const [selected, setSelected] = useState(0);
  const [pencil, setPencil] = useState(false);
  const [loading, setLoading] = useState(!game);
  const [pending, setPending] = useState<SudokuLevel | null>(null);
  const worker = useRef<Worker | null>(null);
  const cells = useRef<(HTMLButtonElement | null)[]>([]);

  const startWorker = useCallback(
    (level: SudokuLevel) => {
      worker.current?.terminate();
      const nextWorker = new Worker(
        new URL("./games/sudoku.worker.ts", import.meta.url),
        { type: "module" },
      );
      worker.current = nextWorker;
      nextWorker.onmessage = (
        event: MessageEvent<{
          ok: boolean;
          result?: { puzzle: number[]; solution: number[] };
        }>,
      ) => {
        if (worker.current !== nextWorker) return;
        const result =
          event.data.ok && event.data.result
            ? event.data.result
            : generateSudoku(level);
        setStore((current) => ({
          ...current,
          sudoku: newSudokuGame(level, result.puzzle, result.solution),
        }));
        setLoading(false);
        nextWorker.terminate();
        worker.current = null;
      };
      nextWorker.onerror = () => {
        if (worker.current !== nextWorker) return;
        const result = generateSudoku(level);
        setStore((current) => ({
          ...current,
          sudoku: newSudokuGame(level, result.puzzle, result.solution),
        }));
        setLoading(false);
        nextWorker.terminate();
        worker.current = null;
      };
      nextWorker.postMessage(level);
    },
    [setStore],
  );
  function create(level: SudokuLevel) {
    setLoading(true);
    setSelected(0);
    startWorker(level);
  }
  const hasGame = !!game;
  useEffect(() => {
    if (!hasGame) startWorker("easy");
    return () => {
      worker.current?.terminate();
      worker.current = null;
    };
  }, [hasGame, startWorker]);
  useEffect(() => {
    if (game?.status !== "playing") return;
    const timer = window.setInterval(() => {
      if (!document.hidden)
        setStore((current) =>
          current.sudoku?.status === "playing"
            ? {
                ...current,
                sudoku: {
                  ...current.sudoku,
                  elapsed: current.sudoku.elapsed + 1,
                },
              }
            : current,
        );
    }, 1000);
    return () => window.clearInterval(timer);
  }, [game?.status, setStore]);
  function request(level: SudokuLevel) {
    if (loading) return;
    if (canContinueSudoku(game)) setPending(level);
    else create(level);
  }
  function change(transform: (game: SudokuGame) => SudokuGame) {
    setStore((current) => {
      if (!current.sudoku) return current;
      const previous = current.sudoku;
      const next = transform(previous);
      if (next === previous) return current;
      const scores =
        next.status === "won" && previous.status !== "won"
          ? addWin(
              current.scores,
              `sudoku:${next.level}:${next.hints ? "assisted" : "regular"}`,
              next.elapsed,
            )
          : current.scores;
      return { ...current, sudoku: next, scores };
    });
  }
  function keyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const directions: Record<string, number> = {
      ArrowRight: index % 9 < 8 ? index + 1 : index,
      ArrowLeft: index % 9 > 0 ? index - 1 : index,
      ArrowDown: index < 72 ? index + 9 : index,
      ArrowUp: index >= 9 ? index - 9 : index,
    };
    if (event.key in directions) {
      event.preventDefault();
      setSelected(directions[event.key]);
      cells.current[directions[event.key]]?.focus();
      return;
    }
    if (/^[1-9]$/.test(event.key)) {
      event.preventDefault();
      change((current) =>
        enterSudoku(current, index, Number(event.key), pencil),
      );
    }
    if (
      event.key === "Delete" ||
      event.key === "Backspace" ||
      event.key === "0"
    ) {
      event.preventDefault();
      change((current) => enterSudoku(current, index, 0));
    }
  }
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <GameHeading title="Sudoku" subtitle={t("sudokuCard")} />
      <div className="game-layout">
        <div className="game-main">
          {loading || !game ? (
            <div className="loading-panel" role="status">
              <span className="spinner" /> <strong>{t("loading")}</strong>
              <span>{t("generating")}</span>
            </div>
          ) : (
            <>
              <div className="stats-bar">
                <div>
                  <span>{t("time")}</span>
                  <strong>{formatTime(game.elapsed)}</strong>
                </div>
                <div>
                  <span>{t("errors")}</span>
                  <strong>{game.errors} / 3</strong>
                </div>
                <div>
                  <span>{t("hints")}</span>
                  <strong>{game.hints}</strong>
                </div>
              </div>
              <div className="sudoku-wrap">
                <div
                  role="grid"
                  aria-label="Sudoku"
                  className={`sudoku-grid ${game.status === "paused" ? "board-paused" : ""}`}
                >
                  {game.values.map((value, index) => {
                    const wrong = !!value && value !== game.solution[index];
                    const related =
                      Math.floor(index / 9) === Math.floor(selected / 9) ||
                      index % 9 === selected % 9 ||
                      (Math.floor(index / 27) === Math.floor(selected / 27) &&
                        Math.floor((index % 9) / 3) ===
                          Math.floor((selected % 9) / 3));
                    return (
                      <button
                        key={index}
                        ref={(node) => {
                          cells.current[index] = node;
                        }}
                        role="gridcell"
                        type="button"
                        tabIndex={selected === index ? 0 : -1}
                        disabled={game.status === "paused"}
                        aria-label={`${t("row")} ${Math.floor(index / 9) + 1}, ${t("column")} ${(index % 9) + 1}: ${value || t("empty")}${wrong ? `, ${t("error")}` : ""}`}
                        aria-selected={selected === index}
                        className={`sudoku-cell ${game.puzzle[index] ? "given" : ""} ${selected === index ? "selected" : related ? "related" : ""} ${wrong ? "wrong" : ""} ${index % 3 === 2 && index % 9 !== 8 ? "box-right" : ""} ${Math.floor(index / 9) % 3 === 2 && index < 72 ? "box-bottom" : ""}`}
                        onFocus={() => setSelected(index)}
                        onClick={() => setSelected(index)}
                        onKeyDown={(event) => keyDown(event, index)}
                      >
                        {value || (
                          <span className="notes-grid">
                            {Array.from({ length: 9 }, (_, digit) => (
                              <small key={digit}>
                                {game.notes[index].includes(digit + 1)
                                  ? digit + 1
                                  : ""}
                              </small>
                            ))}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {game.status === "paused" && (
                  <div className="pause-overlay">
                    <strong>{t("pause")}</strong>
                    <button
                      className="button-primary"
                      onClick={() =>
                        change((current) => ({
                          ...current,
                          status: current.elapsed ? "playing" : "ready",
                        }))
                      }
                    >
                      {t("resume")}
                    </button>
                  </div>
                )}
              </div>
              <div className="number-pad" aria-label={t("numbers")}>
                {Array.from({ length: 9 }, (_, index) => (
                  <button
                    key={index}
                    className="number-button"
                    disabled={
                      game.status === "paused" ||
                      game.status === "won" ||
                      game.status === "lost"
                    }
                    onClick={() =>
                      change((current) =>
                        enterSudoku(current, selected, index + 1, pencil),
                      )
                    }
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              <div className="tool-row">
                <button
                  className="button-secondary"
                  aria-pressed={pencil}
                  onClick={() => setPencil(!pencil)}
                >
                  {t("notes")} {pencil ? "●" : "○"}
                </button>
                <button
                  className="button-secondary"
                  disabled={
                    !game.history.length ||
                    game.status === "paused" ||
                    game.status === "won" ||
                    game.status === "lost"
                  }
                  onClick={() => change(undoSudoku)}
                >
                  {t("undo")}
                </button>
                <button
                  className="button-secondary"
                  disabled={
                    game.status === "paused" ||
                    game.status === "won" ||
                    game.status === "lost"
                  }
                  onClick={() =>
                    change((current) => enterSudoku(current, selected, 0))
                  }
                >
                  {t("erase")}
                </button>
                <button
                  className="button-secondary"
                  disabled={
                    game.status === "paused" ||
                    game.status === "won" ||
                    game.status === "lost"
                  }
                  onClick={() =>
                    change((current) => hintSudoku(current, selected))
                  }
                >
                  {t("hint")}
                </button>
                <button
                  className="button-secondary"
                  disabled={game.status === "won" || game.status === "lost"}
                  onClick={() =>
                    change((current) => ({
                      ...current,
                      status:
                        current.status === "paused"
                          ? current.elapsed
                            ? "playing"
                            : "ready"
                          : "paused",
                    }))
                  }
                >
                  {t(game.status === "paused" ? "resume" : "pause")}
                </button>
              </div>
              {(game.status === "won" || game.status === "lost") && (
                <Result
                  won={game.status === "won"}
                  text={t(game.status === "won" ? "wonSudoku" : "lostSudoku")}
                  time={game.elapsed}
                  again={() => request(game.level)}
                />
              )}
            </>
          )}
        </div>
        <aside className="side-panel">
          <label className="field-label" htmlFor="sudoku-level">
            {t("chooseLevel")}
          </label>
          <select
            id="sudoku-level"
            className="field-select"
            value={game?.level || "easy"}
            disabled={loading}
            onChange={(event) => request(event.target.value as SudokuLevel)}
          >
            <option value="easy">{t("easy")}</option>
            <option value="medium">{t("medium")}</option>
            <option value="hard">{t("hard")}</option>
          </select>
          <button
            className="button-primary mt-3 w-full"
            disabled={loading}
            onClick={() => request(game?.level || "easy")}
          >
            {t("newGame")} ↗
          </button>
          <details className="rules mt-6">
            <summary>{t("rules")}</summary>
            <p>{t("sudokuRules")}</p>
            <p>{t("sudokuControls")}</p>
          </details>
          <div className="side-divider" />
          <h2 className="text-lg font-bold">{t("localStats")}</h2>
          {(["easy", "medium", "hard"] as const).map((level) => (
            <div key={level} className="score-item">
              <strong>{t(level)}</strong>
              <ScoreLine scoreKey={`sudoku:${level}:regular`} />
              <span className="text-xs text-[var(--muted)]">
                {t("assisted")}:{" "}
                {store.scores[`sudoku:${level}:assisted`]?.wins ?? 0} ·{" "}
                {t("best")}:{" "}
                {store.scores[`sudoku:${level}:assisted`]?.best != null
                  ? formatTime(store.scores[`sudoku:${level}:assisted`].best!)
                  : "—"}
              </span>
            </div>
          ))}
        </aside>
      </div>
      {pending && (
        <Confirm
          onCancel={() => setPending(null)}
          onConfirm={() => {
            const level = pending;
            setPending(null);
            create(level);
          }}
        />
      )}
    </div>
  );
}

function MinesweeperPage() {
  const { store, setStore, t } = useArcade();
  const game = store.minesweeper;
  const [mode, setMode] = useState<"reveal" | "flag">("reveal");
  const [focused, setFocused] = useState(0);
  const [pending, setPending] = useState<MineLevel | null>(null);
  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    if (game?.status !== "playing") return;
    const timer = window.setInterval(() => {
      if (!document.hidden)
        setStore((current) =>
          current.minesweeper?.status === "playing"
            ? {
                ...current,
                minesweeper: {
                  ...current.minesweeper,
                  elapsed: current.minesweeper.elapsed + 1,
                },
              }
            : current,
        );
    }, 1000);
    return () => window.clearInterval(timer);
  }, [game?.status, setStore]);
  function request(level: MineLevel) {
    if (canContinueMinesweeper(game)) setPending(level);
    else {
      setFocused(0);
      setStore((current) => ({ ...current, minesweeper: newMineGame(level) }));
    }
  }
  function change(transform: (game: MineGame) => MineGame) {
    setStore((current) => {
      if (!current.minesweeper) return current;
      const previous = current.minesweeper;
      const next = transform(previous);
      if (next === previous) return current;
      const scores =
        next.status === "won" && previous.status !== "won"
          ? addWin(current.scores, `minesweeper:${next.level}`, next.elapsed)
          : current.scores;
      return { ...current, minesweeper: next, scores };
    });
  }
  function activate(index: number) {
    const seed = window.crypto.getRandomValues(new Uint32Array(1))[0];
    change((current) =>
      mode === "flag"
        ? toggleFlag(current, index)
        : current.cells[index].revealed
          ? chordMine(current, index)
          : revealMine(current, index, randomFromSeed(seed)),
    );
  }
  function keyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
    width: number,
    height: number,
  ) {
    const directions: Record<string, number> = {
      ArrowRight: index % width < width - 1 ? index + 1 : index,
      ArrowLeft: index % width > 0 ? index - 1 : index,
      ArrowDown: index < width * (height - 1) ? index + width : index,
      ArrowUp: index >= width ? index - width : index,
    };
    if (event.key in directions) {
      event.preventDefault();
      cells.current[directions[event.key]]?.focus();
    }
    if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      change((current) => toggleFlag(current, index));
    }
  }
  const config = MINE_LEVELS[game?.level || "beginner"];
  const flags = game?.cells.filter((cell) => cell.flagged).length || 0;
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <GameHeading title="Minesweeper" subtitle={t("mineCard")} />
      <div className="game-layout">
        <div className="game-main">
          {game && (
            <>
              <div className="stats-bar">
                <div>
                  <span>{t("time")}</span>
                  <strong>{formatTime(game.elapsed)}</strong>
                </div>
                <div>
                  <span>{t("mines")}</span>
                  <strong>{config.mines}</strong>
                </div>
                <div>
                  <span>{t("flags")}</span>
                  <strong>{flags}</strong>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 pb-5">
                <span className="text-sm font-semibold">{t("mode")}:</span>
                <div className="segmented">
                  <button
                    aria-pressed={mode === "reveal"}
                    onClick={() => setMode("reveal")}
                  >
                    ◇ {t("reveal")}
                  </button>
                  <button
                    aria-pressed={mode === "flag"}
                    onClick={() => setMode("flag")}
                  >
                    ⚑ {t("flag")}
                  </button>
                </div>
              </div>
              <div className="mine-board">
                <div
                  className="mine-grid"
                  data-level={game.level}
                  style={{
                    gridTemplateColumns: `repeat(${config.width}, minmax(0, 1fr))`,
                  }}
                  role="grid"
                  aria-label="Minesweeper"
                >
                  {game.cells.map((cell, index) => {
                    const showMine =
                      cell.mine &&
                      (game.status === "lost" || game.status === "won");
                    const wrongFlag =
                      cell.flagged &&
                      !cell.mine &&
                      (game.status === "lost" || game.status === "won");
                    const visibleNumber =
                      cell.revealed && !cell.mine
                        ? adjacentMineCount(
                            game.cells,
                            index,
                            config.width,
                            config.height,
                          )
                        : 0;
                    return (
                      <button
                        key={index}
                        ref={(node) => {
                          cells.current[index] = node;
                        }}
                        type="button"
                        role="gridcell"
                        tabIndex={focused === index ? 0 : -1}
                        className={`mine-cell ${cell.revealed ? "mine-revealed" : ""} ${cell.flagged ? "mine-flagged" : ""} ${wrongFlag ? "mine-wrong-flag" : ""} ${cell.revealed && cell.mine ? "mine-hit" : ""}`}
                        aria-label={`${t("row")} ${Math.floor(index / config.width) + 1}, ${t("column")} ${(index % config.width) + 1}: ${wrongFlag ? t("wrongFlag") : cell.flagged ? t("flag") : showMine ? t("mines") : cell.revealed ? visibleNumber || t("empty") : t("reveal")}`}
                        onFocus={() => setFocused(index)}
                        onClick={() => activate(index)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          change((current) => toggleFlag(current, index));
                        }}
                        onKeyDown={(event) =>
                          keyDown(event, index, config.width, config.height)
                        }
                      >
                        {wrongFlag ? (
                          "×"
                        ) : cell.flagged && !cell.revealed ? (
                          "⚑"
                        ) : showMine ? (
                          "✹"
                        ) : visibleNumber ? (
                          <span className={`mine-number n${visibleNumber}`}>
                            {visibleNumber}
                          </span>
                        ) : (
                          ""
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              {(game.status === "won" || game.status === "lost") && (
                <Result
                  won={game.status === "won"}
                  text={t(game.status === "won" ? "wonMine" : "lostMine")}
                  time={game.elapsed}
                  again={() => request(game.level)}
                />
              )}
            </>
          )}
        </div>
        <aside className="side-panel">
          <label className="field-label" htmlFor="mine-level">
            {t("chooseSize")}
          </label>
          <select
            id="mine-level"
            className="field-select"
            value={game?.level || "beginner"}
            onChange={(event) => request(event.target.value as MineLevel)}
          >
            <option value="beginner">{t("beginner")} · 9×9</option>
            <option value="intermediate">{t("intermediate")} · 16×16</option>
            <option value="expert">{t("expert")} · 30×16</option>
          </select>
          <button
            className="button-primary mt-3 w-full"
            onClick={() => request(game?.level || "beginner")}
          >
            {t("newGame")} ↗
          </button>
          <details className="rules mt-6">
            <summary>{t("rules")}</summary>
            <p>{t("mineRules")}</p>
            <p>{t("mineControls")}</p>
          </details>
          <div className="side-divider" />
          <h2 className="text-lg font-bold">{t("localStats")}</h2>
          {(["beginner", "intermediate", "expert"] as const).map((level) => (
            <div key={level} className="score-item">
              <strong>{t(level)}</strong>
              <ScoreLine scoreKey={`minesweeper:${level}`} />
            </div>
          ))}
        </aside>
      </div>
      {pending && (
        <Confirm
          onCancel={() => setPending(null)}
          onConfirm={() => {
            setStore((current) => ({
              ...current,
              minesweeper: newMineGame(pending),
            }));
            setFocused(0);
            setPending(null);
          }}
        />
      )}
    </div>
  );
}

function NotFound() {
  const { t } = useArcade();
  return (
    <div className="mx-auto max-w-6xl px-4 py-20">
      <h1 className="text-3xl font-bold">{t("notFound")}</h1>
      <Link className="button-primary mt-6" to="/">
        {t("backHome")}
      </Link>
    </div>
  );
}

export default function App() {
  const [store, setStore] = useState(readStore);
  const [storageFailed, setStorageFailed] = useState(false);
  const t = (key: TextKey) => translate(store.language, key);
  useEffect(() => {
    document.documentElement.lang = store.language;
    document.title = "Mini Arcade";
    if (writeStore(store)) return;
    const timer = window.setTimeout(() => setStorageFailed(true), 0);
    return () => window.clearTimeout(timer);
  }, [store]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        store.theme === "system"
          ? media.matches
            ? "dark"
            : "light"
          : store.theme;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [store.theme]);
  return (
    <Context.Provider value={{ store, setStore, t }}>
      <div className="min-h-screen">
        <Header />
        {storageFailed && (
          <div className="storage-warning" role="alert">
            {t("storageWarning")}
          </div>
        )}
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/sudoku" element={<SudokuPage />} />
            <Route path="/minesweeper" element={<MinesweeperPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <footer className="border-t border-[var(--line)] py-8 text-center text-sm text-[var(--muted)]">
          Mini Arcade · {t("footer")}
        </footer>
      </div>
    </Context.Provider>
  );
}
