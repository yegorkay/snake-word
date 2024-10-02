import type { CellType } from "@/types";

const ROW_COUNT = 16;
const COLUMN_COUNT = 10;

const MAX_LETTERS_ON_GRID = 20; // Configurable number of letters to place on the grid
const SNAKE_SPEED_IN_MS = 500;
// Some random GPT-assisted weights.
const letterWeights = {
  A: 8.17,
  B: 1.49,
  C: 2.78,
  D: 4.25,
  E: 12.7,
  F: 2.23,
  G: 2.02,
  H: 6.09,
  I: 7.0,
  J: 0.15,
  K: 0.77,
  L: 4.03,
  M: 2.41,
  N: 6.75,
  O: 7.51,
  P: 1.93,
  Q: 0.1,
  R: 5.99,
  S: 6.33,
  T: 9.06,
  U: 2.76,
  V: 0.98,
  W: 2.36,
  X: 0.15,
  Y: 1.97,
  Z: 0.07,
};

const directionsMap = {
  arrowup: { x: 0, y: -1 },
  arrowdown: { x: 0, y: 1 },
  arrowleft: { x: -1, y: 0 },
  arrowright: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
  Up: { x: 0, y: -1 },
  Down: { x: 0, y: 1 },
  Left: { x: -1, y: 0 },
  Right: { x: 1, y: 0 },
} as const satisfies { [key: string]: CellType["coordinates"] };

const FLASH_DURATION = 3000;
const CHANGE_RANDOM_LETTER_DURATION = 1000;

export const gameConfig = {
  ROW_COUNT,
  COLUMN_COUNT,
  MAX_LETTERS_ON_GRID,
  SNAKE_SPEED_IN_MS,
  letterWeights,
  directionsMap,
  FLASH_DURATION,
  CHANGE_RANDOM_LETTER_DURATION,
};
