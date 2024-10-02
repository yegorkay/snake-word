import type { CellType } from "@/types";
import { getRandomWeightedLetter } from "./get-random-weighted-letter";

export function randomLetterPlacement(
  currentGrid: CellType[][],
  snake: CellType[],
) {
  const emptyCells: { row: number; col: number }[] = [];

  currentGrid.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (
        cell.type === "empty" &&
        !snake.some(
          (segment) =>
            segment.coordinates.x === colIndex &&
            segment.coordinates.y === rowIndex,
        )
      ) {
        emptyCells.push({ row: rowIndex, col: colIndex });
      }
    });
  });

  if (emptyCells.length === 0) return { row: -1, col: -1, letter: "A" };

  const randomIndex = Math.floor(Math.random() * emptyCells.length);
  const cell = emptyCells[randomIndex];
  const randomLetter = getRandomWeightedLetter();

  return {
    row: cell.row,
    col: cell.col,
    letter: randomLetter,
  };
}
