import type { CellType } from "@/types";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { gameConfig } from "@/config";
import { instantiateGrid } from "@/utils/instantiate-grid";
import { randomLetterPlacement } from "@/utils/random-letter-placement";
import { getDirection } from "@/utils/get-direction";

// TODO anytime a new letter flashes it sits in empty slot

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
  snakeSpeed: number;
  timeRemaining: number;
};

type GridActions = {
  setGrid: (grid: CellType[][]) => void;
  setSnake: (snake: CellType[]) => void;
  setLetters: (letters: CellType[]) => void;
  toggleEnableMovement: () => void;
  setDirection: (
    directionKey: keyof typeof gameConfig.directionsMap | undefined,
  ) => void;
  setGameOver: (gameOver: boolean) => void;
  setIsTutorialOpen: (isOpen: boolean) => void;
  setSnakeSpeed: (speed: number) => void;
  initializeGrid: () => void;
  moveSnake: () => void;
  placeNewLetter: (updatedGrid: CellType[][]) => void;
  setTimeRemaining: (time: GridState["timeRemaining"]) => void;
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
    grid: [] as GridState["grid"],
    snake: [] as GridState["snake"],
    letters: [] as GridState["letters"],
    enableMovement: true as GridState["enableMovement"],
    direction: {
      coordinates: { x: 0, y: 0 },
      direction: undefined,
    } as GridState["direction"],
    snakeSpeed: gameConfig.SNAKE_SPEED_IN_MS as GridState["snakeSpeed"],
    gameOver: false as GridState["gameOver"],
    isTutorialOpen: true as GridState["isTutorialOpen"],

    timeRemaining: gameConfig.TIME_REMAINING,

    setTimeRemaining: (timeRemaining) => {
      if (timeRemaining === 0) {
        set({ enableMovement: true });
      }
      set({ timeRemaining });
    },

    setGrid: (grid) => set({ grid }),
    setSnake: (snake) => set({ snake }),
    setLetters: (letters) => set({ letters }),
    toggleEnableMovement: () =>
      set((state) => ({ enableMovement: !state.enableMovement })),
    setDirection: (key) => {
      if (key === undefined) {
        set({
          direction: {
            coordinates: { x: 0, y: 0 },
            direction: undefined,
          },
        });
      }

      const direction = getDirection(key);

      if (direction === "left") {
        set({
          direction: {
            coordinates: gameConfig.directionsMap.arrowleft,
            direction: "arrowleft",
          },
        });
      } else if (direction === "right") {
        set({
          direction: {
            coordinates: gameConfig.directionsMap.arrowright,
            direction: "arrowright",
          },
        });
      } else if (direction === "up") {
        set({
          direction: {
            coordinates: gameConfig.directionsMap.arrowup,
            direction: "arrowup",
          },
        });
      } else if (direction === "down") {
        set({
          direction: {
            coordinates: gameConfig.directionsMap.arrowdown,
            direction: "arrowdown",
          },
        });
      }
    },
    setGameOver: (gameOver) => set({ gameOver }),
    setIsTutorialOpen: (isOpen) => set({ isTutorialOpen: isOpen }),
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
          updatedGrid[row][col] = {
            type: "letter",
            letter: letter,
            coordinates: { x: col, y: row },
          } satisfies CellType;

          newLetters.push(updatedGrid[row][col]);
        }
      }

      set((state) => {
        state.letters = [...state.letters, ...newLetters];
        state.grid = updatedGrid;
      });
    },
  })),
);
