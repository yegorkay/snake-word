import React, { useState, useEffect, useCallback } from "react";
import "./Grid.css"; // For styling the grid cells

const GRID_SIZE = 10; // 10x10 grid for simplicity
const ENABLE_MOVEMENT = true;

type SnakeSegment = {
  x: number;
  y: number;
  letter?: string;
};

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
const INIT_SNAKE_HEAD_LETTER =
  letters[Math.floor(Math.random() * letters.length)];

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
    letter: INIT_SNAKE_HEAD_LETTER, // Initialize snake head with letter "A" for now
  };

  for (let i = 0; i < MAX_LETTERS_ON_GRID; i++) {
    const { row, col, letter } = randomLetterPlacement(initialGrid, [
      snakeHead,
    ]);
    if (row !== -1 && col !== -1) {
      initialGrid[row][col].type = "letter"; // Mark letter position
      initialGrid[row][col].letter = letter;
      lettersOnGrid.push({ x: col, y: row }); // Store letter information
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
      const head = prevSnake[0]; // Get current head
      const newHead = {
        x: (head.x + direction.x + GRID_SIZE) % GRID_SIZE, // Wrap around grid horizontally
        y: (head.y + direction.y + GRID_SIZE) % GRID_SIZE, // Wrap around grid vertically
        letter: head.letter ?? INIT_SNAKE_HEAD_LETTER, // Retain the head's current letter
      } as SnakeSegment;

      // Create a new grid to avoid mutating the original
      const updatedGrid = grid.map((row) => row.map((cell) => ({ ...cell })));

      let growSnake = false; // Flag to check if we need to grow the snake

      // If the new head position is a letter, pick it up
      if (updatedGrid[newHead.y][newHead.x].type === "letter") {
        const pickedLetter = updatedGrid[newHead.y][newHead.x].letter as string;

        // Set the new head's letter to the picked letter
        newHead.letter = pickedLetter;

        // Clear the letter from the grid
        updatedGrid[newHead.y][newHead.x] = {
          type: "empty",
          letter: undefined,
        };

        // Mark that the snake needs to grow
        growSnake = true;
      }

      // Create a new snake array
      const newSnake = [newHead];

      // If the snake should grow, we add the previous segments plus a new one
      if (growSnake) {
        // Add the rest of the snake's body and retain the letters
        newSnake.push(
          ...prevSnake.map((segment) => ({
            ...segment,
          })),
        );
      } else {
        // Shift snake body by one (move the head forward and retain letters)
        for (let i = 0; i < prevSnake.length - 1; i++) {
          newSnake.push({
            ...prevSnake[i],
            letter: prevSnake[i + 1].letter, // Shift the letter down the snake body
          });
        }
      }

      // Clear the tail position in the grid
      const tail = prevSnake[prevSnake.length - 1];
      updatedGrid[tail.y][tail.x] = { type: "empty", letter: undefined };

      // Mark the new snake positions on the grid, preserving the letters
      newSnake.forEach(({ x, y, letter }) => {
        updatedGrid[y][x] = { type: "snake", letter: letter }; // Keep letters in their positions
      });

      setGrid(updatedGrid); // Update the grid with new positions
      return newSnake; // Return the updated snake
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
      <h2>{JSON.stringify(snake.map((s) => s.letter).join(""))}</h2>
      <Grid grid={grid} letters={letters} />
    </div>
  );
};

export default Game;
