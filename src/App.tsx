import React, { useState, useEffect, useCallback } from "react";
import "./Grid.css"; // For styling the grid cells

const GRID_SIZE = 10; // 10x10 grid for simplicity
const ENABLE_MOVEMENT = true;

type CellType = {
  type: "empty" | "snake" | "letter";
  letter?: string;
};

type Coordinate = { x: number; y: number };

interface GridProps {
  grid: CellType[][];
  letters: Coordinate[];
}

// A functional component that renders the grid
const Grid: React.FC<GridProps> = ({ grid }) => {
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

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""); // Array of letters
const MAX_LETTERS_ON_GRID = 2; // Configurable number of letters to place on the grid
const SNAKE_SPEED_IN_MS = 250;

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

function initializeSnake(): Coordinate[] {
  const mid = Math.ceil(GRID_SIZE / 2) - 1;
  return [{ x: mid, y: mid }];
}

function initializeGrid() {
  const initialSnake = initializeSnake();
  const initialGrid = generateEmptyGrid();

  const lettersOnGrid: Coordinate[] = [];

  initialSnake.forEach(({ x, y }) => {
    initialGrid[y][x].type = "snake"; // Mark the snake's position on the grid
  });

  for (let i = 0; i < MAX_LETTERS_ON_GRID; i++) {
    const { row, col, letter } = randomLetterPlacement(
      initialGrid,
      initialSnake,
    );
    if (row !== -1 && col !== -1) {
      initialGrid[row][col].type = "letter"; // Mark letter position
      initialGrid[row][col].letter = letter;
      lettersOnGrid.push({ x: col, y: row }); // Store letter information
    }
  }

  return {
    grid: initialGrid,
    snake: initialSnake,
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
  const randomLetter = letters[Math.floor(Math.random() * letters.length)];

  return {
    row: cell.row,
    col: cell.col,
    letter: randomLetter,
  };
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

  // Function to update the snake's position based on its current direction
  const moveSnake = useCallback(() => {
    setSnake((prevSnake) => {
      const head = prevSnake[0];
      const newHead = {
        x: (head.x + direction.x + GRID_SIZE) % GRID_SIZE, // Wrap around grid horizontally
        y: (head.y + direction.y + GRID_SIZE) % GRID_SIZE, // Wrap around grid vertically
      };

      // Create a new grid to avoid mutating the original
      const updatedGrid = grid.map((row) => row.map((cell) => ({ ...cell }))); // Create a new grid

      // Check if the new head position is a letter
      if (updatedGrid[newHead.y][newHead.x].type === "letter") {
        // Grow the snake
        const newSnake = [newHead, ...prevSnake]; // Add new head

        // Clear the letter from the grid
        updatedGrid[newHead.y][newHead.x] = {
          type: "empty",
          letter: undefined,
        } satisfies CellType;

        // Update snake positions on the grid
        newSnake.forEach(({ x, y }) => {
          updatedGrid[y][x] = {
            type: "snake",
            letter: updatedGrid[y][x].letter,
          } satisfies CellType; // Ensure snake is marked
        });

        setGrid(updatedGrid); // Update the grid
        return newSnake; // Return the new snake
      }

      // Move the snake normally
      const newSnake = [newHead, ...prevSnake.slice(0, prevSnake.length - 1)];
      const tail = prevSnake[prevSnake.length - 1];

      // Clear the tail position in the grid
      updatedGrid[tail.y][tail.x] = {
        type: "empty",
        letter: undefined,
      } satisfies CellType; // Clear the tail

      // Mark the new snake positions on the grid
      newSnake.forEach(({ x, y }) => {
        updatedGrid[y][x] = {
          type: "snake",
          letter: updatedGrid[y][x].letter,
        } satisfies CellType; // Mark the snake
      });

      setGrid(updatedGrid); // Update the grid with new positions
      return newSnake; // Return the moved snake
    });
  }, [direction, grid]);

  // Update snake position on grid and handle movement
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      // @ts-expect-error for now
      const newDirection = directions[key];

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

    // Move the snake every SNAKE_SPEED_IN_MS
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
      <Grid grid={grid} letters={letters} />
    </div>
  );
};

export default Game;
