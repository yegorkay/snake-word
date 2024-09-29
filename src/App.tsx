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
} as const satisfies { [key: string]: Coordinate };

function getDirectionClass(direction: keyof typeof directions | undefined) {
  switch (direction) {
    case "arrowup":
    case "w":
      return "up";
    case "arrowdown":
    case "s":
      return "down";
    case "arrowleft":
    case "a":
      return "left";
    case "arrowright":
    case "d":
      return "right";
    default:
      return "";
  }
}

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

type Coordinate = { x: number; y: number };

type CellType = {
  type: "empty" | "snake" | "letter" | "collision";
  coordinates: Coordinate;
  letter?: string;
};

// A functional component that renders the grid
const Grid = ({
  grid,
  direction,
  snakeHead,
}: {
  grid: CellType[][];
  direction: {
    coordinates: Coordinate;
    direction: keyof typeof directions | undefined;
  };
  snakeHead: CellType;
}) => {
  const directionClass = getDirectionClass(direction.direction);

  return (
    <div className="grid">
      {grid.flat().map((cell, index) => {
        const rowIndex = Math.floor(index / GRID_SIZE); // Calculate the row index
        const colIndex = index % GRID_SIZE; // Calculate the column index
        const isSnakeHead =
          rowIndex === snakeHead.coordinates.y &&
          colIndex === snakeHead.coordinates.x;
        const cellClass =
          cell.type === "snake" && directionClass
            ? `pointed-${directionClass}` // Apply direction-specific class
            : "";

        return (
          <div
            className={`cell ${cell.type} ${isSnakeHead ? cellClass : ""}`.trim()}
            key={index}
          >
            {cell?.letter && (
              <span
                className={`letter ${cell.type === "snake" && isSnakeHead && directionClass ? `snake-${directionClass}` : ""}`.trim()}
              >
                {cell.letter}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

function findLongestValidWordAtEnd(
  snakeSegments: CellType[],
  validWordSet: Set<string> | undefined,
) {
  // Get letters in the order they appear in the snake
  const letters = snakeSegments
    .map((segment) => segment.letter)
    .join("")
    .toLowerCase();

  let longestWord = ""; // Initialize a variable to hold the longest word

  // Start checking from the end of the snake
  for (let end = letters.length; end > 0; end--) {
    for (let start = 0; start < end; start++) {
      const substring = letters.slice(start, end);
      // Check if the substring is in the validWordSet
      if (
        validWordSet?.has(substring) &&
        substring.length > longestWord.length
      ) {
        longestWord = substring; // Update longestWord if a longer valid word is found
      }
    }
  }

  return longestWord; // Return the longest valid word found
}

// Function to generate an empty grid
function generateEmptyGrid(): CellType[][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from(
      { length: GRID_SIZE },
      () =>
        ({
          type: "empty",
          letter: undefined,
          coordinates: { x: 0, y: 0 },
        }) satisfies CellType,
    ),
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

function initializeSnake(): CellType {
  const mid = Math.ceil(GRID_SIZE / 2) - 1;
  return {
    coordinates: { x: mid, y: mid },
    letter: INIT_SNAKE_HEAD_LETTER,
    type: "snake",
  };
}

function initializeGrid() {
  const snakeHead = initializeSnake();
  const initialGrid = generateEmptyGrid();

  const lettersOnGrid: CellType[] = [];

  initialGrid[snakeHead.coordinates.y][snakeHead.coordinates.x] = {
    type: "snake",
    letter: INIT_SNAKE_HEAD_LETTER,
    coordinates: { x: snakeHead.coordinates.x, y: snakeHead.coordinates.y },
  };

  // Place random letters initially
  for (let i = 0; i < MAX_LETTERS_ON_GRID; i++) {
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

// Function to place a random letter on the grid
function randomLetterPlacement(currentGrid: CellType[][], snake: CellType[]) {
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

function getSnakeLetters(snake: CellType[]) {
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
  const [direction, setDirection] = useState<{
    coordinates: Coordinate;
    direction: keyof typeof directions | undefined;
  }>({
    coordinates: { x: 0, y: 0 },
    direction: undefined,
  }); // Current direction of movement

  const [gameOver, setGameOver] = useState(false); // Track game over state
  const [longestWord, setLongestWord] = useState("");

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
      const newLetters: CellType[] = [];

      for (let i = 0; i < MAX_LETTERS_ON_GRID; i++) {
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

      setLetters(newLetters);
      return updatedGrid;
    },
    [snake],
  );

  const checkCollision = useCallback(
    (newHead: CellType) => {
      return (
        snake.length > 1 &&
        snake.some(
          (segment) =>
            segment.coordinates.x === newHead.coordinates.x &&
            segment.coordinates.y === newHead.coordinates.y,
        )
      );
    },
    [snake],
  );

  // Function to update the snake's position based on its current direction
  const moveSnake = useCallback(() => {
    setSnake((prevSnake) => {
      const head = prevSnake[0]; // Get current head

      // Calculate new head position based on current direction
      const newHead = {
        coordinates: {
          x:
            (head.coordinates.x + direction.coordinates.x + GRID_SIZE) %
            GRID_SIZE,
          y:
            (head.coordinates.y + direction.coordinates.y + GRID_SIZE) %
            GRID_SIZE,
        },
        type: "snake",
        letter: head.letter, // Use the head's current letter for now
      } as CellType;

      // Check if the snake collides with itself
      if (checkCollision(newHead)) {
        const updatedGrid = grid.map((row) =>
          row.map((cell) => {
            if (cell.type === "snake") {
              return { ...cell, type: "collision" } satisfies CellType;
            }
            return cell;
          }),
        );

        setGrid(updatedGrid); // Mark collision
        setGameOver(true); // End the game
        return prevSnake; // Stop movement
      }

      const updatedGrid = grid.map((row) => row.map((cell) => ({ ...cell })));

      let growSnake = false;

      // If new head position is a letter, the snake grows
      if (
        updatedGrid[newHead.coordinates.y][newHead.coordinates.x].type ===
        "letter"
      ) {
        const pickedLetter = updatedGrid[newHead.coordinates.y][
          newHead.coordinates.x
        ].letter as string;

        newHead.letter = pickedLetter; // Assign the new head its letter
        growSnake = true; // Signal growth

        // Clear the old letters and place new ones
        updatedGrid.forEach((row) => {
          row.forEach((cell) => {
            if (cell.type === "letter") {
              cell.type = "empty";
              cell.letter = undefined;
            }
          });
        });

        setGrid(placeNewLetter(updatedGrid)); // Place new letters
      }

      // Build the new snake based on the current move
      const newSnake = [newHead];

      if (growSnake) {
        // Grow the snake
        newSnake.push(
          ...prevSnake.map((segment) => ({
            ...segment,
          })),
        );
      } else {
        // Just move forward, no growth
        for (let i = 0; i < prevSnake.length - 1; i++) {
          newSnake.push({
            ...prevSnake[i],
            letter: prevSnake[i + 1].letter,
          });
        }
      }

      // Clear the tail in the grid
      const tail = prevSnake[prevSnake.length - 1];
      updatedGrid[tail.coordinates.y][tail.coordinates.x] = {
        type: "empty",
        letter: undefined,
        coordinates: {
          y: tail.coordinates.y,
          x: tail.coordinates.x,
        },
      };

      // Update the grid with the new snake positions
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

      setGrid(updatedGrid); // Update the grid with the new positions

      const longestValidWord = findLongestValidWordAtEnd(
        newSnake,
        validWordSet,
      );

      if (longestValidWord.length > 1) {
        console.log(`Found a valid word: ${longestValidWord}`);
        setLongestWord(longestValidWord);
      }

      return newSnake; // Return the updated snake
    });
  }, [direction, grid, placeNewLetter, checkCollision, validWordSet]);

  // Update snake position on grid and handle movement
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase() as keyof typeof directions;
      const newDirection = directions[key];

      if (newDirection) {
        // Prevent reversing direction
        if (
          (direction.coordinates.x === 0 && newDirection.x !== 0) ||
          (direction.coordinates.y === 0 && newDirection.y !== 0)
        ) {
          setDirection({ coordinates: newDirection, direction: key });
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
    <div className="container">
      <h1>Snake Word Game</h1>
      <h2>Current snake: {gameOver ? "Game Over!" : getSnakeLetters(snake)}</h2>
      <h3>Longest word: {longestWord}</h3>
      <h3>Letters on board: {letters.map((l) => l.letter).join(", ")}</h3>
      <Grid grid={grid} direction={direction} snakeHead={snake[0]} />
    </div>
  );
};

export default Game;
