import type { CellType } from "@/types";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { gameConfig } from "@/config";
import { instantiateGrid } from "@/utils/instantiate-grid";
import { randomLetterPlacement } from "@/utils/random-letter-placement";
import { getRandomWeightedLetter } from "@/utils/get-random-weighted-letter";

type GridState = {
  grid: CellType[][];
  snake: CellType[];
  letters: CellType[];
  enableMovement: boolean;
  direction: {
    coordinates: CellType["coordinates"];
    direction: keyof typeof gameConfig.directionsMap | undefined;
  };
  gameOver: boolean;
  isTutorialOpen: boolean;
  flashingLetter: CellType | null;
  flashStartTime: number | null;
  snakeSpeed: number;
};

type GridActions = {
  setGrid: (grid: CellType[][]) => void;
  setSnake: (snake: CellType[]) => void;
  setLetters: (letters: CellType[]) => void;
  toggleEnableMovement: () => void;
  setDirection: (direction: GridState["direction"]) => void;
  setGameOver: (gameOver: boolean) => void;
  setIsTutorialOpen: (isOpen: boolean) => void;
  setFlashingLetter: (letter: CellType | null) => void;
  setFlashStartTime: (time: number | null) => void;
  setSnakeSpeed: (speed: number) => void;
  initializeGrid: () => void;
  moveSnake: () => void;
  placeNewLetter: (updatedGrid: CellType[][]) => void;
  selectRandomLetter: () => void;
  changeRandomLetter: () => void;
};

const checkCollision = (newHead: CellType, snake: CellType[]) => {
  return (
    snake.length > 1 &&
    snake.some(
      (segment) =>
        segment.coordinates.x === newHead.coordinates.x &&
        segment.coordinates.y === newHead.coordinates.y,
    )
  );
};

export const useGridStore = create<GridState & GridActions>()(
  immer((set, get) => ({
    grid: [] as CellType[][],
    snake: [] as CellType[],
    letters: [] as CellType[],
    enableMovement: true,
    direction: {
      coordinates: { x: 0, y: 0 },
      direction: undefined,
    } as GridState["direction"],
    flashingLetter: null,
    flashStartTime: null,
    snakeSpeed: gameConfig.SNAKE_SPEED_IN_MS,
    gameOver: false,
    isTutorialOpen: true,

    setGrid: (grid) => set({ grid }),
    setSnake: (snake) => set({ snake }),
    setLetters: (letters) => set({ letters }),
    toggleEnableMovement: () =>
      set((state) => ({ enableMovement: !state.enableMovement })),
    setDirection: (direction) => set({ direction }),
    setGameOver: (gameOver) => set({ gameOver }),
    setIsTutorialOpen: (isOpen) => set({ isTutorialOpen: isOpen }),
    setFlashingLetter: (letter) => set({ flashingLetter: letter }),
    setFlashStartTime: (time) => set({ flashStartTime: time }),
    setSnakeSpeed: (speed) => set({ snakeSpeed: speed }),

    initializeGrid: () => {
      const {
        grid: initialGrid,
        snake: initialSnake,
        letters: initialLetters,
      } = instantiateGrid();

      set({
        grid: initialGrid,
        snake: initialSnake,
        letters: initialLetters,
      });
    },

    moveSnake: () => {
      const { snake, direction } = get();
      const head = snake[0];

      const newHead = {
        coordinates: {
          x:
            (head.coordinates.x +
              direction.coordinates.x +
              gameConfig.COLUMN_COUNT) %
            gameConfig.COLUMN_COUNT,
          y:
            (head.coordinates.y +
              direction.coordinates.y +
              gameConfig.ROW_COUNT) %
            gameConfig.ROW_COUNT,
        },
        type: "snake",
        letter: head.letter,
      } as CellType;

      if (checkCollision(newHead, snake)) {
        set((state) => {
          state.grid = state.grid.map((row) =>
            row.map((cell) =>
              cell.type === "snake" ? { ...cell, type: "collision" } : cell,
            ),
          );
          state.gameOver = true;
        });
        return;
      }

      set((state) => {
        const updatedGrid = state.grid.map((row) =>
          row.map((cell) => ({ ...cell })),
        );
        let growSnake = false;

        if (
          updatedGrid[newHead.coordinates.y][newHead.coordinates.x].type ===
          "letter"
        ) {
          const pickedLetter = updatedGrid[newHead.coordinates.y][
            newHead.coordinates.x
          ].letter as string;

          newHead.letter = pickedLetter;
          growSnake = true;

          updatedGrid[newHead.coordinates.y][newHead.coordinates.x] = {
            type: "empty",
            letter: undefined,
            coordinates: newHead.coordinates,
          };

          state.placeNewLetter(updatedGrid);
          state.snakeSpeed = Math.round(
            state.snakeSpeed - gameConfig.SNAKE_SPEED_IN_MS * (0.5 / 15),
          );
        }

        const newSnake = [newHead];

        if (growSnake) {
          newSnake.push(...state.snake.map((segment) => ({ ...segment })));
        } else {
          for (let i = 0; i < state.snake.length - 1; i++) {
            newSnake.push({
              ...state.snake[i],
              letter: state.snake[i + 1].letter,
            });
          }
        }

        const tail = state.snake[state.snake.length - 1];
        updatedGrid[tail.coordinates.y][tail.coordinates.x] = {
          type: "empty",
          letter: undefined,
          coordinates: {
            y: tail.coordinates.y,
            x: tail.coordinates.x,
          },
        };

        newSnake.forEach(({ coordinates, letter }) => {
          updatedGrid[coordinates.y][coordinates.x] = {
            type: "snake",
            letter: letter,
            coordinates: {
              x: coordinates.x,
              y: coordinates.y,
            },
          };
        });

        state.grid = updatedGrid;
        state.snake = newSnake;
      });
    },

    placeNewLetter: (updatedGrid) => {
      const { snake } = get();
      const remainingLetters = updatedGrid
        .flat()
        .filter((cell) => cell.type === "letter").length;
      const newLetters: CellType[] = [];

      for (
        let i = 0;
        i <
        Math.min(
          gameConfig.MAX_LETTERS_ON_GRID - remainingLetters,
          remainingLetters,
        );
        i++
      ) {
        const { row, col, letter } = randomLetterPlacement(updatedGrid, snake);
        if (row !== -1 && col !== -1) {
          updatedGrid[row][col].type = "letter";
          updatedGrid[row][col].letter = letter;

          newLetters.push({
            coordinates: { x: col, y: row },
            type: "letter",
            letter,
          });
        }
      }

      set((state) => {
        state.letters = [...state.letters, ...newLetters];
        state.grid = updatedGrid;
      });
    },

    selectRandomLetter: () => {
      const { flashingLetter } = get();
      if (flashingLetter) return;

      set((state) => {
        const currentGrid = state.grid.map((row) =>
          row.map((cell) => ({ ...cell })),
        );
        const letterCells = currentGrid
          .flat()
          .filter((cell) => cell.type === "letter");

        if (letterCells.length === 0) return;

        const randomIndex = Math.floor(Math.random() * letterCells.length);
        const cellToChange = letterCells[randomIndex];

        state.flashingLetter = cellToChange;
        state.flashStartTime = Date.now();
        state.grid = currentGrid;
      });
    },

    changeRandomLetter: () => {
      const { flashingLetter, flashStartTime } = get();
      if (!flashingLetter || !flashStartTime) return;

      const currentTime = Date.now();
      if (currentTime - flashStartTime < gameConfig.FLASH_DURATION) return;

      set((state) => {
        const updatedGrid = state.grid.map((row) =>
          row.map((cell) =>
            cell.coordinates.x === flashingLetter.coordinates.x &&
            cell.coordinates.y === flashingLetter.coordinates.y
              ? {
                  ...cell,
                  letter: getRandomWeightedLetter(),
                }
              : cell,
          ),
        );

        state.letters = state.letters.map((letter) =>
          letter.coordinates.x === flashingLetter.coordinates.x &&
          letter.coordinates.y === flashingLetter.coordinates.y
            ? {
                ...updatedGrid[flashingLetter.coordinates.y][
                  flashingLetter.coordinates.x
                ],
              }
            : letter,
        );

        state.flashingLetter = null;
        state.flashStartTime = null;
        state.grid = updatedGrid;
      });
    },
  })),
);
