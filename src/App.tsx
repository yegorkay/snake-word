import { useState, useEffect, useCallback } from "react";
import "./Grid.css"; // For styling the grid cells
import { useQuery } from "@tanstack/react-query";

const GRID_SIZE = 10; // 10x10 grid for simplicity
const ENABLE_MOVEMENT = true;
const MAX_LETTERS_ON_GRID = 3; // Configurable number of letters to place on the grid
const SNAKE_SPEED_IN_MS = 500;
// Directions map for key presses
const directions = {
  arrowup: { x: 0, y: -1 },
  arrowdown: { x: 0, y: 1 },
  arrowleft: { x: -1, y: 0 },
  arrowright: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
} as { [key: string]: Coordinate };

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

type SnakeSegment = {
  x: number;
  y: number;
  letter?: string;
};

type CellType = {
  type: "empty" | "snake" | "letter" | "collision";
  letter?: string;
};

type Coordinate = { x: number; y: number };

// A functional component that renders the grid
const Grid = ({ grid }: { grid: CellType[][]; letters: Coordinate[] }) => {
  return (
    <div className="grid">
      {grid.map((row, rowIndex) => (
        <div className="row" key={rowIndex}>
          {row.map((cell, colIndex) => {
            return (
              <div className={`cell ${cell.type}`} key={colIndex}>
                {cell?.letter && <span className="letter">{cell.letter}</span>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// Function to generate an empty grid
function generateEmptyGrid(): CellType[][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({
      type: "empty",
      letter: undefined,
    })),
  );
}

function getRandomWeightedLetter() {
  const totalWeight = Object.values(letterWeights).reduce(
    (sum, weight) => sum + weight,
    0,
  );
  const random = Math.random() * totalWeight;

  let cumulativeWeight = 0;
  for (const [letter, weight] of Object.entries(letterWeights)) {
    cumulativeWeight += weight;
    if (random < cumulativeWeight) {
      return letter;
    }
  }

  return "A";
}

const INIT_SNAKE_HEAD_LETTER = getRandomWeightedLetter();

function initializeSnake(): SnakeSegment {
  const mid = Math.ceil(GRID_SIZE / 2) - 1;
  return { x: mid, y: mid, letter: INIT_SNAKE_HEAD_LETTER };
}

function initializeGrid() {
  const snakeHead = initializeSnake();
  const initialGrid = generateEmptyGrid();

  const lettersOnGrid: Coordinate[] = [];

  initialGrid[snakeHead.y][snakeHead.x] = {
    type: "snake",
    letter: INIT_SNAKE_HEAD_LETTER,
  };

  // Place random letters initially
  for (let i = 0; i < MAX_LETTERS_ON_GRID; i++) {
    const { row, col, letter } = randomLetterPlacement(initialGrid, [
      snakeHead,
    ]);
    if (row !== -1 && col !== -1) {
      initialGrid[row][col].type = "letter";
      initialGrid[row][col].letter = letter;
      lettersOnGrid.push({ x: col, y: row });
    }
  }

  return {
    grid: initialGrid,
    snake: [snakeHead],
    letters: lettersOnGrid,
  };
}

// Function to place a random letter on the grid
function randomLetterPlacement(currentGrid: CellType[][], snake: Coordinate[]) {
  const emptyCells: { row: number; col: number }[] = [];

  currentGrid.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (
        cell.type === "empty" &&
        !snake.some(
          (segment) => segment.x === colIndex && segment.y === rowIndex,
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

function getSnakeLetters(snake: SnakeSegment[]) {
  return snake.map((segment) => segment.letter).join("");
}

const Game = () => {
  const {
    grid: initialGrid,
    snake: initialSnake,
    letters: initialLetters,
  } = initializeGrid();

  const [grid, setGrid] = useState(initialGrid);
  const [snake, setSnake] = useState(initialSnake);
  const [letters, setLetters] = useState(initialLetters);
  const [direction, setDirection] = useState<Coordinate>({
    x: 0,
    y: 0,
  }); // Current direction of movement

  const [gameOver, setGameOver] = useState(false); // Track game over state

  const { data: validWordSet } = useQuery({
    queryFn: () =>
      fetch("./2of12.txt")
        .then((d) => d.text())
        .then((txt) => new Set(txt.split(/\r?\n/))),
    queryKey: ["words"],
    staleTime: Infinity,
  });

  // Function to place two new random letters after picking up one
  const placeNewLetter = useCallback(
    (updatedGrid: CellType[][]) => {
      const newLetters: Coordinate[] = [];

      for (let i = 0; i < MAX_LETTERS_ON_GRID; i++) {
        const { row, col, letter } = randomLetterPlacement(updatedGrid, snake);
        if (row !== -1 && col !== -1) {
          updatedGrid[row][col].type = "letter";
          updatedGrid[row][col].letter = letter;
          newLetters.push({ x: col, y: row });
        }
      }

      setLetters(newLetters);
      return updatedGrid;
    },
    [snake],
  );

  const checkCollision = useCallback(
    (newHead: SnakeSegment) => {
      return (
        snake.length > 1 &&
        snake.some(
          (segment) => segment.x === newHead.x && segment.y === newHead.y,
        )
      );
    },
    [snake],
  );

  // Function to update the snake's position based on its current direction
  const moveSnake = useCallback(() => {
    setSnake((prevSnake) => {
      const head = prevSnake[0]; // Get current head
      const newHead = {
        x: (head.x + direction.x + GRID_SIZE) % GRID_SIZE,
        y: (head.y + direction.y + GRID_SIZE) % GRID_SIZE,
        letter: head.letter,
      } as SnakeSegment;

      // Check if snake collides with itself
      if (checkCollision(newHead)) {
        const updatedGrid = grid.map((row) =>
          row.map((cell) => {
            if (cell.type === "snake") {
              return { ...cell, type: "collision" } satisfies CellType; // Change snake cells to "collision"
            }
            return cell;
          }),
        );

        setGrid(updatedGrid); // Update the grid to show the collision
        setGameOver(true); // End the game
        return prevSnake; // Keep snake as is, no more movement
      }

      // Create a new grid to avoid mutating the original
      const updatedGrid = grid.map((row) => row.map((cell) => ({ ...cell })));

      let growSnake = false;

      // If the new head position is a letter, pick it up
      if (updatedGrid[newHead.y][newHead.x].type === "letter") {
        const pickedLetter = updatedGrid[newHead.y][newHead.x].letter as string;

        // Set the new head's letter to the picked letter
        newHead.letter = pickedLetter;

        // Clear all letters from the grid
        updatedGrid.forEach((row) => {
          row.forEach((cell) => {
            if (cell.type === "letter") {
              cell.type = "empty";
              cell.letter = undefined;
            }
          });
        });

        // Mark that the snake needs to grow
        growSnake = true;

        // Place two new random letters on the grid
        setGrid(placeNewLetter(updatedGrid));

        const snakeLetters = getSnakeLetters(snake);

        if (validWordSet?.has(snakeLetters)) {
          console.log(`Found a valid word: ${snakeLetters}`);
        }
      }

      const newSnake = [newHead];

      if (growSnake) {
        newSnake.push(
          ...prevSnake.map((segment) => ({
            ...segment,
          })),
        );
      } else {
        // Shift snake body by one
        for (let i = 0; i < prevSnake.length - 1; i++) {
          newSnake.push({
            ...prevSnake[i],
            letter: prevSnake[i + 1].letter,
          });
        }
      }

      // Clear the tail position in the grid
      const tail = prevSnake[prevSnake.length - 1];
      updatedGrid[tail.y][tail.x] = { type: "empty", letter: undefined };

      newSnake.forEach(({ x, y, letter }) => {
        updatedGrid[y][x] = { type: "snake", letter: letter };
      });

      setGrid(updatedGrid); // Update the grid with new positions
      return newSnake; // Return the updated snake
    });
  }, [direction, grid, placeNewLetter, checkCollision, snake, validWordSet]);

  // Update snake position on grid and handle movement
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const newDirection = directions[key as keyof typeof directions];

      if (newDirection) {
        // Prevent reversing direction
        if (
          (direction.x === 0 && newDirection.x !== 0) ||
          (direction.y === 0 && newDirection.y !== 0)
        ) {
          setDirection(newDirection);
        }
      }
    };

    window.addEventListener(
      "keydown",
      ENABLE_MOVEMENT ? handleKeyDown : () => {},
    );

    const interval = ENABLE_MOVEMENT
      ? setInterval(() => {
          moveSnake();
        }, SNAKE_SPEED_IN_MS)
      : 0;

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearInterval(interval);
    };
  }, [direction, moveSnake]);

  return (
    <div>
      <h1>Snake Word Game</h1>
      <h2>{gameOver ? "Game Over!" : getSnakeLetters(snake)}</h2>
      {JSON.stringify(snake)}
      <Grid grid={grid} letters={letters} />
    </div>
  );
};
export default Game;

// Maybe a cool idea?

// As you go on, another twist to the snake is that you can collide with a segment of yourself
// to break off chunks of letters that are not legal

// So:

// PIE-KSOOD

// And if the snake head touches any part of the snake body that does not have legal words,
// those break off in place on the grid and become a block to avoid on the grid

// PIE x x x x KSOOO
