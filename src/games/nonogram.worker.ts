import { generatePuzzle, curated, type NonogramSize } from "./nonogram";

self.onmessage = (event: MessageEvent<NonogramSize>) => {
  const size = event.data;
  const puzzle =
    generatePuzzle(size) ??
    curated[size][Math.floor(Math.random() * curated[size].length)];
  self.postMessage({
    ...puzzle,
    id: `generated-${size}-${Date.now()}`,
    kind: "generated",
    name: "",
  });
};
