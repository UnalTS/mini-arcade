import { expect, test } from "@playwright/test";

test("home Minesweeper preview numbers match adjacent flags", async ({ page }) => {
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
      localStorage.getItem("mini-arcade-v1") || "{}",
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
      localStorage.getItem("mini-arcade-v1") || "{}",
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
