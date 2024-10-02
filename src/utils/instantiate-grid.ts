import { gameConfig } from "@/config";
import type { CellType } from "@/types";
import { getRandomWeightedLetter } from "./get-random-weighted-letter";
import { generateEmptyGrid } from "./generate-empty-grid";
import { randomLetterPlacement } from "./random-letter-placement";

export function instantiateGrid() {
  const snakeHead = {
    coordinates: {
      x: Math.ceil(gameConfig.COLUMN_COUNT / 2) - 1,
      y: Math.ceil(gameConfig.ROW_COUNT / 2) - 1,
    },
    letter: getRandomWeightedLetter(),
    type: "snake",
  } as CellType;
  const initialGrid = generateEmptyGrid(
    gameConfig.ROW_COUNT,
    gameConfig.COLUMN_COUNT,
  );

  const lettersOnGrid: CellType[] = [];

  initialGrid[snakeHead.coordinates.y][snakeHead.coordinates.x] = snakeHead;

  // Place random letters initially
  for (let i = 0; i < gameConfig.MAX_LETTERS_ON_GRID; i++) {
    const { row, col, letter } = randomLetterPlacement(initialGrid, [
      snakeHead,
    ]);
    if (row !== -1 && col !== -1) {
      initialGrid[row][col].type = "letter";
      initialGrid[row][col].letter = letter;
      lettersOnGrid.push({
        coordinates: { x: col, y: row },
        letter,
        type: "letter",
      });
    }
  }

  return {
    grid: initialGrid,
    snake: [snakeHead],
    letters: lettersOnGrid,
  };
}
