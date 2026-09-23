import { generateSudoku, type SudokuLevel } from "./sudoku";

self.onmessage = (event: MessageEvent<SudokuLevel>) => {
  try {
    self.postMessage({ ok: true, result: generateSudoku(event.data) });
  } catch {
    self.postMessage({ ok: false });
  }
};
