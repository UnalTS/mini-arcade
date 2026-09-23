import { expect, test } from "@playwright/test";

test("all game cards have large rounded play links", async ({ page }) => {
  await page.goto("/");
  const links = page.locator(".game-card .card-link");
  await expect(links).toHaveCount(4);
  for (const link of await links.all()) {
    const box = await link.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(58);
    expect(
      await link.evaluate((element) => getComputedStyle(element).borderRadius),
    ).toBe("999px");
  }
});

test("wins are shown only inside each game and grouped by difficulty", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem(
      "mini-arcade-v2",
      JSON.stringify({
        version: 2,
        language: "de",
        theme: "light",
        scores: {
          "sudoku:easy:regular": { wins: 2, best: 35 },
          "sudoku:easy:assisted": { wins: 1, best: 48 },
          "sudoku:hard:regular": { wins: 3, best: 70 },
          "minesweeper:beginner": { wins: 2, best: 20 },
          "minesweeper:expert": { wins: 3, best: 80 },
          "nonogram:5:curated:regular": { wins: 2, best: 30 },
          "nonogram:5:generated:assisted": { wins: 1, best: 44 },
          "nonogram:15:curated:regular": { wins: 3, best: 99 },
        },
        snakeBest: 75,
      }),
    ),
  );
  await page.reload();
  await expect(page.locator("main")).not.toContainText("Siege");
  await expect(page.locator("main")).not.toContainText("Bestzeit");
  await expect(page.locator("main")).not.toContainText("Rekord");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Sudoku" })
    .click();
  await expect(page.locator(".score-item").nth(0)).toContainText("Siege: 3");
  await expect(page.locator(".score-item").nth(1)).toContainText("Siege: 0");
  await expect(page.locator(".score-item").nth(2)).toContainText("Siege: 3");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Minesweeper" })
    .click();
  await expect(page.locator(".score-item").nth(0)).toContainText("Siege: 2");
  await expect(page.locator(".score-item").nth(1)).toContainText("Siege: 0");
  await expect(page.locator(".score-item").nth(2)).toContainText("Siege: 3");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Nonogram" })
    .click();
  await expect(page.locator(".score-item").nth(0)).toContainText("Siege: 3");
  await expect(page.locator(".score-item").nth(2)).toContainText("Siege: 3");
  await expect(page.locator("main")).not.toContainText("Bestzeit");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Snake" })
    .click();
  await expect(page.locator("main")).toContainText("Rekord");
  await expect(page.locator("main")).toContainText("75");
});

test("new games appear on home and work in both languages", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("article")).toHaveCount(4);
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Nonogram" })
    .click();
  await expect(
    page.getByRole("grid", { name: "Nonogram" }).getByRole("gridcell"),
  ).toHaveCount(25);
  await page.getByLabel("Sprache").selectOption("en");
  await expect(
    page.getByText("Discover a little picture using numbers."),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Snake" })
    .click();
  await expect(page.getByRole("application", { name: "Snake" })).toBeVisible();
});

test("Nonogram mistakes, undo and 15x15 mobile fit", async ({ page }) => {
  await page.goto("/nonogram");
  const board = page.getByRole("grid", { name: "Nonogram" });
  await expect(board.getByRole("gridcell")).toHaveCount(25);
  await board.getByRole("gridcell").first().click();
  await expect(page.locator(".stats-bar strong").nth(1)).toHaveText("1/3");
  await page.getByRole("button", { name: "Rückgängig" }).click();
  await expect(page.locator(".stats-bar strong").nth(1)).toHaveText("1/3");
  await page.getByLabel("Feldgröße").selectOption("15");
  await expect(board.getByRole("gridcell")).toHaveCount(225);
  const before = await page.evaluate(() => ({
    body: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }));
  expect(before.body).toBeLessThanOrEqual(before.viewport + 1);
  await page.getByRole("button", { name: "Vergrößern" }).click();
  await expect(page.locator(".ng-board")).toHaveAttribute("data-zoom", "true");
  const after = await page.evaluate(() => ({
    body: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }));
  expect(after.body).toBeLessThanOrEqual(after.viewport + 1);
});

test("Snake starts, pauses, and resets on reload", async ({ page }) => {
  await page.goto("/snake");
  await expect(page.getByRole("application", { name: "Snake" })).toBeVisible();
  await page.getByRole("button", { name: "Starten" }).click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Weiter" }).first(),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Starten" })).toBeVisible();
});

test("Snake keeps the food row the same size as every other row", async ({ page }) => {
  await page.goto("/snake");
  const sizes = await page.locator(".snake-cell").evaluateAll((cells) => {
    const food = cells.find((cell) => cell.classList.contains("snake-food"));
    const first = cells[0].getBoundingClientRect();
    const apple = food?.getBoundingClientRect();
    const last = cells[cells.length - 1].getBoundingClientRect();
    return {
      count: cells.length,
      first: [first.width, first.height],
      apple: apple && [apple.width, apple.height],
      last: [last.width, last.height],
    };
  });
  expect(sizes.count).toBe(400);
  expect(sizes.apple).toBeTruthy();
  for (const size of [sizes.apple!, sizes.last]) {
    expect(Math.abs(size[0] - sizes.first[0])).toBeLessThan(1);
    expect(Math.abs(size[1] - sizes.first[1])).toBeLessThan(1);
  }
  expect(Math.abs(sizes.first[0] - sizes.first[1])).toBeLessThan(1);
});

test("Snake responds to keyboard and on-screen arrows", async ({ page }) => {
  await page.goto("/snake");
  await page.getByRole("button", { name: "Starten" }).click();
  await page.getByRole("application", { name: "Snake" }).press("ArrowUp");
  await expect
    .poll(() =>
      page
        .locator(".snake-cell")
        .evaluateAll((cells) =>
          cells.findIndex((cell) => cell.classList.contains("snake-head")),
        ),
    )
    .toBeLessThan(210);
  await page.getByRole("button", { name: "Neues Spiel" }).click();
  await page.getByRole("button", { name: "Oben" }).click();
  await expect
    .poll(() =>
      page
        .locator(".snake-cell")
        .evaluateAll((cells) =>
          cells.findIndex((cell) => cell.classList.contains("snake-head")),
        ),
    )
    .toBeLessThan(210);
});

test("Snake accepts a swipe on mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  await page.goto("/snake");
  await page.locator(".snake-board").evaluate((board) => {
    const start = new Touch({
      identifier: 1,
      target: board,
      clientX: 100,
      clientY: 100,
    });
    const end = new Touch({
      identifier: 1,
      target: board,
      clientX: 100,
      clientY: 40,
    });
    board.dispatchEvent(
      new TouchEvent("touchstart", {
        bubbles: true,
        touches: [start],
        changedTouches: [start],
      }),
    );
    board.dispatchEvent(
      new TouchEvent("touchend", {
        bubbles: true,
        touches: [],
        changedTouches: [end],
      }),
    );
  });
  await expect
    .poll(() =>
      page
        .locator(".snake-cell")
        .evaluateAll((cells) =>
          cells.findIndex((cell) => cell.classList.contains("snake-head")),
        ),
    )
    .toBeLessThan(210);
});

test("Snake automatically pauses when the page becomes hidden", async ({
  page,
}) => {
  await page.goto("/snake");
  await page.getByRole("button", { name: "Starten" }).click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(
    page.getByRole("button", { name: "Weiter" }).first(),
  ).toBeVisible();
});

test("Nonogram progress persists and completed art unlocks the next puzzle", async ({
  page,
}) => {
  await page.goto("/nonogram");
  const first = page
    .getByRole("grid", { name: "Nonogram" })
    .getByRole("gridcell");
  const solution = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("mini-arcade-v2") || "{}");
    return saved.nonogram.puzzle.solution as boolean[];
  });
  for (const [index, filled] of solution.entries())
    if (filled) await first.nth(index).click();
  await expect(
    page.getByRole("button", { name: "Nächstes Rätsel" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Nächstes Rätsel" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Nächstes Rätsel" }).click();
  await expect(
    page.getByRole("grid", { name: "Nonogram" }).getByRole("gridcell"),
  ).toHaveCount(25);
  const progress = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("mini-arcade-v2") || "{}")
        .nonogramProgress[5],
  );
  expect(progress).toBe(1);
});

test("Nonogram continues with a checked generated puzzle after the six motifs", async ({
  page,
}) => {
  await page.goto("/nonogram");
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("mini-arcade-v2") || "{}");
    saved.nonogramProgress[5] = 6;
    saved.nonogram.status = "won";
    localStorage.setItem("mini-arcade-v2", JSON.stringify(saved));
  });
  await page.reload();
  await page.getByRole("button", { name: "Nächstes Rätsel" }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("mini-arcade-v2") || "{}").nonogram
            ?.puzzle.kind,
      ),
    )
    .toBe("generated");
  await expect(
    page.getByRole("grid", { name: "Nonogram" }).getByRole("gridcell"),
  ).toHaveCount(25);
});

test("home Minesweeper preview numbers match adjacent flags", async ({
  page,
}) => {
  await page.goto("/");
  const preview = page.locator(".mine-visual span");
  await expect(preview).toHaveCount(9);
  const cells = await preview.evaluateAll((elements) =>
    elements.map((element) => ({
      flag: element.classList.contains("mine-preview-flag"),
      text: element.textContent?.trim() ?? "",
    })),
  );
  for (let index = 0; index < cells.length; index++) {
    if (cells[index].flag) continue;
    const x = index % 3;
    const y = Math.floor(index / 3);
    const adjacentFlags = cells.filter((cell, neighbor) => {
      const dx = Math.abs((neighbor % 3) - x);
      const dy = Math.abs(Math.floor(neighbor / 3) - y);
      return cell.flag && dx <= 1 && dy <= 1;
    }).length;
    expect(cells[index].text).toBe(adjacentFlags ? String(adjacentFlags) : "");
  }
  expect(cells[4].text).toBe("3");
});

test("shows continue only after a game action", async ({ page }) => {
  await page.goto("/");
  const sudokuCard = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "Sudoku" }) });
  const mineCard = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "Minesweeper" }) });
  await expect(
    sudokuCard.getByRole("link", { name: /Jetzt spielen/ }),
  ).toBeVisible();
  await expect(
    mineCard.getByRole("link", { name: /Jetzt spielen/ }),
  ).toBeVisible();

  await mineCard.getByRole("link").click();
  await page.getByRole("button", { name: /Flagge/ }).click();
  await page
    .getByRole("grid", { name: "Minesweeper" })
    .getByRole("gridcell")
    .first()
    .click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Startseite" })
    .click();
  await expect(
    mineCard.getByRole("link", { name: /Fortsetzen/ }),
  ).toBeVisible();
  await expect(
    sudokuCard.getByRole("link", { name: /Jetzt spielen/ }),
  ).toBeVisible();
});

test("Sudoku keyboard notes work after clicking the notes toggle", async ({
  page,
}) => {
  await page.goto("/sudoku");
  const cells = page
    .getByRole("grid", { name: "Sudoku" })
    .getByRole("gridcell");
  await expect(cells).toHaveCount(81);
  const index = await cells.evaluateAll((buttons) =>
    buttons.findIndex((button) =>
      button.getAttribute("aria-label")?.includes(": leer"),
    ),
  );
  expect(index).toBeGreaterThanOrEqual(0);
  await cells.nth(index).click();
  const notes = page.getByRole("button", { name: /Notizen/ });
  await notes.click();
  await expect(notes).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("1");
  await expect(
    cells.nth(index).locator(".notes-grid small").first(),
  ).toHaveText("1");
  await expect(cells.nth(index)).toHaveClass(/selected/);
  expect(
    await cells
      .nth(index)
      .evaluate((cell) => getComputedStyle(cell).outlineStyle),
  ).toBe("none");
  await expect(cells.nth(index)).toHaveAttribute("aria-label", /: leer/);
  const solution = await page.evaluate(
    (at) =>
      JSON.parse(localStorage.getItem("mini-arcade-v2") || "{}").sudoku
        .solution[at],
    index,
  );
  await notes.click();
  await expect(notes).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.press(String(solution));
  await expect(cells.nth(index)).toHaveAttribute(
    "aria-label",
    new RegExp(`: ${solution}$`),
  );
});

test("Sudoku highlights every matching filled number", async ({ page }) => {
  await page.goto("/sudoku");
  const cells = page
    .getByRole("grid", { name: "Sudoku" })
    .getByRole("gridcell");
  await expect(cells).toHaveCount(81);
  const values = await cells.evaluateAll((buttons) =>
    buttons.map((button) =>
      Number(
        button.getAttribute("aria-label")?.match(/: ([1-9])(?:,|$)/)?.[1] ?? 0,
      ),
    ),
  );
  const digit = values.find(
    (value) =>
      value !== 0 && values.filter((other) => other === value).length >= 2,
  );
  expect(digit).toBeTruthy();
  await cells.nth(values.indexOf(digit!)).click();
  for (let index = 0; index < values.length; index++) {
    if (values[index] === digit)
      await expect(cells.nth(index)).toHaveClass(/same-value/);
    else await expect(cells.nth(index)).not.toHaveClass(/same-value/);
  }
  const empty = values.indexOf(0);
  await cells.nth(empty).click();
  await expect(page.locator(".sudoku-cell.same-value")).toHaveCount(0);
});

test("navigates, switches language, and resumes Sudoku", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Sudoku" })
    .click();
  await expect(page.getByRole("grid", { name: "Sudoku" })).toBeVisible();
  const empty = page.getByRole("gridcell", { name: /leer/ }).first();
  await empty.click();
  await page.getByRole("button", { name: "1", exact: true }).last().click();
  await page.reload();
  await expect(page.getByRole("grid", { name: "Sudoku" })).toBeVisible();
  await page.getByLabel("Sprache").selectOption("en");
  await expect(page.getByRole("button", { name: "New game" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByLabel("Appearance").selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("minesweeper first reveal and touch flag mode", async ({ page }) => {
  await page.goto("/minesweeper");
  const board = page.getByRole("grid", { name: "Minesweeper" });
  await expect(board).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await board.getByRole("gridcell").first().click();
  await expect(board.getByRole("gridcell").first()).toHaveClass(
    /mine-revealed/,
  );
  const wrongNumbers = await page.evaluate(() => {
    const game = JSON.parse(
      localStorage.getItem("mini-arcade-v2") || "{}",
    ).minesweeper;
    const buttons = [...document.querySelectorAll(".mine-cell")];
    return game.cells.flatMap(
      (cell: { mine: boolean; revealed: boolean }, index: number) => {
        if (!cell.revealed || cell.mine) return [];
        const x = index % 9;
        const y = Math.floor(index / 9);
        let mines = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (
              nx >= 0 &&
              nx < 9 &&
              ny >= 0 &&
              ny < 9 &&
              game.cells[ny * 9 + nx].mine
            )
              mines++;
          }
        return buttons[index].textContent?.trim() ===
          (mines ? String(mines) : "")
          ? []
          : [index];
      },
    );
  });
  expect(wrongNumbers).toEqual([]);
  await page.getByRole("button", { name: /Flagge/ }).click();
  const covered = board.locator("button:not(.mine-revealed)").first();
  await covered.click();
  await expect(covered).toHaveClass(/mine-flagged/);
});

test("Minesweeper cell positions stay fixed after flags, reveals, and a mine", async ({
  page,
}) => {
  await page.goto("/minesweeper");
  await page.locator("#mine-level").selectOption("expert");
  const cells = page.locator(".mine-cell");
  const positions = () =>
    cells.evaluateAll((buttons) =>
      buttons.map((button) => {
        const box = button.getBoundingClientRect();
        return [box.x, box.y, box.width, box.height];
      }),
    );
  const initial = await positions();
  const expectStable = async () => {
    const current = await positions();
    expect(current).toHaveLength(initial.length);
    for (let index = 0; index < current.length; index++)
      for (let coordinate = 0; coordinate < 4; coordinate++)
        expect(
          Math.abs(current[index][coordinate] - initial[index][coordinate]),
        ).toBeLessThan(0.5);
  };
  await cells.nth(1).click({ button: "right" });
  await expect(cells.nth(1)).toHaveClass(/mine-flagged/);
  await expectStable();
  await cells.first().click();
  await expect(cells.first()).toHaveClass(/mine-revealed/);
  await expectStable();
  const mine = await page.evaluate(() => {
    const game = JSON.parse(
      localStorage.getItem("mini-arcade-v2") || "{}",
    ).minesweeper;
    return game.cells.findIndex(
      (cell: { mine: boolean; flagged: boolean }) => cell.mine && !cell.flagged,
    );
  });
  await cells.nth(mine).click();
  await expectStable();
});

test("expert board fits inside its panel and replacement asks after progress", async ({
  page,
}) => {
  await page.goto("/minesweeper");
  await page.getByLabel("Feldgröße").selectOption("expert");
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(
    page.getByRole("grid", { name: "Minesweeper" }).getByRole("gridcell"),
  ).toHaveCount(480);
  const cells = page
    .getByRole("grid", { name: "Minesweeper" })
    .getByRole("gridcell");
  await cells.first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(cells.nth(1)).toBeFocused();
  await page.keyboard.press("f");
  await expect(cells.nth(1)).toHaveClass(/mine-flagged/);
  await page.getByLabel("Feldgröße").selectOption("beginner");
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Abbrechen" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    await page.locator(".mine-board").evaluate((element) => {
      const last = element.querySelector(".mine-cell:last-child");
      return (
        element.scrollWidth <= element.clientWidth &&
        !!last &&
        last.getBoundingClientRect().right <=
          element.getBoundingClientRect().right + 1
      );
    }),
  ).toBe(true);
});

test("wrong flags are distinguished from real mines after a loss", async ({
  page,
}) => {
  await page.goto("/minesweeper");
  const cells = page
    .getByRole("grid", { name: "Minesweeper" })
    .getByRole("gridcell");
  await cells.first().click();
  const indices = await page.evaluate(() => {
    const game = JSON.parse(
      localStorage.getItem("mini-arcade-v2") || "{}",
    ).minesweeper;
    return {
      wrong: game.cells.findIndex(
        (cell: { mine: boolean; revealed: boolean }) =>
          !cell.mine && !cell.revealed,
      ),
      mine: game.cells.findIndex(
        (cell: { mine: boolean; revealed: boolean }) =>
          cell.mine && !cell.revealed,
      ),
    };
  });
  expect(indices.wrong).toBeGreaterThanOrEqual(0);
  expect(indices.mine).toBeGreaterThanOrEqual(0);
  await page.getByRole("button", { name: /Flagge/ }).click();
  await cells.nth(indices.wrong).click();
  await page.getByRole("button", { name: /Aufdecken/ }).click();
  await cells.nth(indices.mine).click();
  await expect(cells.nth(indices.wrong)).toHaveClass(/mine-wrong-flag/);
  await expect(cells.nth(indices.wrong)).toHaveAttribute(
    "aria-label",
    /Falsche Flagge/,
  );
});
