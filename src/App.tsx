import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useInterval } from "./use-interval";
import { useSwipeable } from "react-swipeable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
// Directions map for key presses
const directionsMap = {
  arrowup: { x: 0, y: -1 },
  arrowdown: { x: 0, y: 1 },
  arrowleft: { x: -1, y: 0 },
  arrowright: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
} as const satisfies { [key: string]: Coordinate };

function getDirectionClass(direction: keyof typeof directionsMap | undefined) {
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

type Coordinate = { x: number; y: number };

type CellType = {
  type: "empty" | "snake" | "letter" | "collision";
  coordinates: Coordinate;
  letter?: string;
};

const cellTypeColorMap = {
  collision: "bg-red-600",
  empty: "bg-white",
  letter: "bg-yellow-600",
  snake: "bg-zinc-300",
} as { [type in CellType["type"]]: string };

const arrowMap = {
  up: "[clip-path:polygon(0%_40%,50%_0%,100%_40%,100%_100%,0%_100%)]",
  down: "[clip-path:polygon(0%_0%,100%_0%,100%_60%,50%_100%,0%_60%)]",
  left: "[clip-path:polygon(40%_0%,100%_0%,100%_100%,40%_100%,0%_50%)]",
  right: "[clip-path:polygon(0%_0%,60%_0%,100%_50%,60%_100%,0%_100%)]",
} as {
  [key in ReturnType<typeof getDirectionClass>]: string;
};

const FLASH_DURATION = 3000;
const CHANGE_RANDOM_LETTER_DURATION = 1000;

// A functional component that renders the grid
const Grid = ({
  grid,
  direction,
  snake,
  longestWordCoordinates,
  flashingLetter,
}: {
  grid: CellType[][];
  direction: {
    coordinates: Coordinate;
    direction: keyof typeof directionsMap | undefined;
  };
  snake: CellType[];
  longestWordCoordinates: Coordinate[];
  flashingLetter: CellType | null;
}) => {
  const directionClass = getDirectionClass(direction.direction);
  const snakeHead = snake[0];

  return (
    <div
      style={{
        gridTemplateColumns: `repeat(${COLUMN_COUNT}, 1fr)`,
        gridTemplateRows: `repeat(${ROW_COUNT}, 1fr)`,
      }}
      className={"border-slate-400 border-2 grid gap-1 w-full max-w-sm p-1"}
    >
      {grid.flat().map((cell, index) => {
        const rowIndex = Math.floor(index / COLUMN_COUNT);
        const colIndex = index % COLUMN_COUNT;
        const isSnakeHead =
          rowIndex === snakeHead.coordinates.y &&
          colIndex === snakeHead.coordinates.x;

        const cellClass = cellTypeColorMap[grid[rowIndex][colIndex].type];

        const isValidWordCell = Boolean(
          longestWordCoordinates.find(
            (coords) => rowIndex === coords.y && colIndex === coords.x,
          ),
        );

        const isFlashingCell =
          flashingLetter &&
          rowIndex === flashingLetter.coordinates.y &&
          colIndex === flashingLetter.coordinates.x;

        return (
          <div
            className={`relative aspect-square flex justify-center items-center font-bold text-lg text-center ${isValidWordCell ? "bg-green-600" : cellClass} ${isSnakeHead ? arrowMap[directionClass] : ""} ${isFlashingCell ? "animate-pulse" : ""}`.trim()}
            key={index}
          >
            {cell?.letter && <span>{cell.letter}</span>}
          </div>
        );
      })}
    </div>
  );
};

function getLettersFromSnake(snake: CellType[]) {
  const letters = snake.map((segment) => segment.letter);
  const potentialWord = letters.join("").toLowerCase();

  return { letters, potentialWord };
}

function findLongestValidWordAtEnd(
  snakeSegments: CellType[],
  validWordSet: Set<string> | undefined,
) {
  // Get letters in the order they appear in the snake
  const { potentialWord } = getLettersFromSnake(snakeSegments);

  let longestWord = ""; // Initialize a variable to hold the longest word
  let longestWordCoordinates: Coordinate[] = [];

  // Start checking from the end of the snake
  for (let end = potentialWord.length; end > 0; end--) {
    for (let start = 0; start < end; start++) {
      const substring = potentialWord.slice(start, end);
      // Check if the substring is in the validWordSet
      if (
        validWordSet?.has(substring) &&
        substring.length > longestWord.length
      ) {
        longestWord = substring; // Update longestWord if a longer valid word is found
        // Extract the corresponding coordinates for the valid word
        longestWordCoordinates = snakeSegments
          .slice(start, end)
          .map((segment) => segment.coordinates);
      }
    }
  }

  return { word: longestWord, coordinates: longestWordCoordinates }; // Return the longest valid word found
}

// Function to generate an empty grid
function generateEmptyGrid(ROW_COUNT: number, COL_COUNT: number): CellType[][] {
  return Array.from({ length: ROW_COUNT }, (_, rowIndex) =>
    Array.from(
      { length: COL_COUNT },
      (_, colIndex) =>
        ({
          type: "empty",
          letter: undefined,
          coordinates: { x: colIndex, y: rowIndex },
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
  return {
    coordinates: {
      x: Math.ceil(COLUMN_COUNT / 2) - 1,
      y: Math.ceil(ROW_COUNT / 2) - 1,
    },
    letter: INIT_SNAKE_HEAD_LETTER,
    type: "snake",
  };
}

function initializeGrid() {
  const snakeHead = initializeSnake();
  const initialGrid = generateEmptyGrid(ROW_COUNT, COLUMN_COUNT);

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

const Game = () => {
  const {
    grid: initialGrid,
    snake: initialSnake,
    letters: initialLetters,
  } = useMemo(() => initializeGrid(), []);

  const [snakeSpeed, setSnakeSpeed] = useState(SNAKE_SPEED_IN_MS);

  const [grid, setGrid] = useState(initialGrid);
  const [snake, setSnake] = useState(initialSnake);
  const [letters, setLetters] = useState(initialLetters);
  const [enableMovement, toggleEnableMovement] = useState(true);
  const [direction, setDirection] = useState<{
    coordinates: Coordinate;
    direction: keyof typeof directionsMap | undefined;
  }>({
    coordinates: { x: 0, y: 0 },
    direction: undefined,
  }); // Current direction of movement

  const [gameOver, setGameOver] = useState(false); // Track game over state
  const [isTutorialOpen, setIsTutorialOpen] = useState(true);

  const [flashingLetter, setFlashingLetter] = useState<CellType | null>(null);
  const [flashStartTime, setFlashStartTime] = useState<number | null>(null);

  const handlers = useSwipeable({
    onSwiped: (eventData) => {
      if (eventData.dir === "Left") {
        setDirection({
          coordinates: directionsMap.arrowleft,
          direction: "arrowleft",
        });
      } else if (eventData.dir === "Right") {
        setDirection({
          coordinates: directionsMap.arrowright,
          direction: "arrowright",
        });
      } else if (eventData.dir === "Up") {
        setDirection({
          coordinates: directionsMap.arrowup,
          direction: "arrowup",
        });
      } else if (eventData.dir === "Down") {
        setDirection({
          coordinates: directionsMap.arrowdown,
          direction: "arrowdown",
        });
      }
    },
  });

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
      const remainingLetters = updatedGrid
        .flat()
        .filter((cell) => cell.type === "letter").length;

      const newLetters: CellType[] = [];

      for (
        let i = 0;
        i < Math.min(MAX_LETTERS_ON_GRID - remainingLetters, remainingLetters);
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

      setLetters((prevLetters) => [...prevLetters, ...newLetters]);

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

  const selectRandomLetter = useCallback(() => {
    if (flashingLetter) return; // Don't select a new letter if one is already flashing

    setGrid((prevGrid) => {
      const currentGrid = prevGrid.map((row) =>
        row.map((cell) => ({ ...cell })),
      );

      const letterCells = currentGrid
        .flat()
        .filter((cell) => cell.type === "letter");

      if (letterCells.length === 0) return currentGrid;

      const randomIndex = Math.floor(Math.random() * letterCells.length);
      const cellToChange = letterCells[randomIndex];

      setFlashingLetter(cellToChange);
      setFlashStartTime(Date.now());

      return currentGrid;
    });
  }, [flashingLetter]);

  // Function to update the snake's position based on its current direction
  const moveSnake = useCallback(() => {
    setSnake((prevSnake) => {
      const head = prevSnake[0]; // Get current head

      // Calculate new head position based on current direction
      const newHead = {
        coordinates: {
          x:
            (head.coordinates.x + direction.coordinates.x + COLUMN_COUNT) %
            COLUMN_COUNT,
          y:
            (head.coordinates.y + direction.coordinates.y + ROW_COUNT) %
            ROW_COUNT,
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

        // Only clear the picked-up letter
        updatedGrid[newHead.coordinates.y][newHead.coordinates.x] = {
          type: "empty",
          letter: undefined,
          coordinates: newHead.coordinates,
        };

        setGrid(placeNewLetter(updatedGrid)); // Place only as many letters as needed

        // Some arbitrary number factor
        setSnakeSpeed((prevSpeed) =>
          Math.round(prevSpeed - SNAKE_SPEED_IN_MS * (0.5 / 15)),
        );
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

      return newSnake; // Return the updated snake
    });
  }, [direction, grid, placeNewLetter, checkCollision]);

  const changeRandomLetter = useCallback(() => {
    if (!flashingLetter || !flashStartTime) return;

    const currentTime = Date.now();
    if (currentTime - flashStartTime < FLASH_DURATION) return;

    setGrid((prevGrid) => {
      const updatedGrid = prevGrid.map((row) =>
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

      setLetters((prevLetters) => {
        return prevLetters.map((letter) =>
          letter.coordinates.x === flashingLetter.coordinates.x &&
          letter.coordinates.y === flashingLetter.coordinates.y
            ? {
                ...updatedGrid[flashingLetter.coordinates.y][
                  flashingLetter.coordinates.x
                ],
              }
            : letter,
        );
      });

      setFlashingLetter(null);
      setFlashStartTime(null);

      return updatedGrid;
    });
  }, [flashingLetter, flashStartTime]);

  // Update snake position on grid and handle movement
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase() as keyof typeof directionsMap;
      const newDirection = directionsMap[key];

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
      enableMovement ? handleKeyDown : () => {},
    );

    if (gameOver) {
      window.removeEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [direction, moveSnake, enableMovement, gameOver]);

  const reverseSnake = useMemo(() => [...snake].reverse(), [snake]);

  const longestWordData = useMemo(
    () => findLongestValidWordAtEnd(reverseSnake, validWordSet),
    [validWordSet, reverseSnake],
  );

  useInterval(
    () => selectRandomLetter(),
    !gameOver && enableMovement
      ? FLASH_DURATION + CHANGE_RANDOM_LETTER_DURATION
      : null, // Select a new letter every 4 seconds
  );

  useInterval(
    () => {
      if (!gameOver && enableMovement && flashingLetter) {
        changeRandomLetter();
      }
    },
    !gameOver && enableMovement && flashingLetter
      ? CHANGE_RANDOM_LETTER_DURATION
      : null,
  );

  useInterval(
    () => {
      if (enableMovement) {
        moveSnake();
      }
    },
    gameOver ? null : snakeSpeed,
  );

  return (
    <div
      {...handlers}
      className="p-4 flex flex-col items-start sm:items-center h-svh"
    >
      {import.meta.env.DEV && (
        <div className="sm:flex hidden flex-col items-center">
          <h3>Letters history: {letters.map((l) => l.letter).join(", ")}</h3>
          <button
            className="border-2 border-slate-600 p-2 m-2"
            onClick={() => toggleEnableMovement((en) => !en)}
          >
            Toggle Movement: {JSON.stringify(enableMovement)}
          </button>
          Snake: {JSON.stringify(reverseSnake.map(({ letter }) => letter))}
        </div>
      )}
      <Grid
        grid={grid}
        direction={direction}
        snake={snake}
        longestWordCoordinates={longestWordData.coordinates}
        flashingLetter={flashingLetter}
      />

      <Dialog
        open={isTutorialOpen}
        onOpenChange={() => setIsTutorialOpen((isOpen) => !isOpen)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Snakes & Letters - Tutorial</DialogTitle>
            <DialogDescription className="sm:hidden block">
              Insert goal of the game text.
            </DialogDescription>
            <DialogDescription className="sm:hidden block">
              <strong>Mobile controls:</strong> Swipe anywhere on the screen in
              the direction you want the snake to go! Swipe left to go left, and
              so on.
            </DialogDescription>
            <DialogDescription className="sm:block hidden">
              <strong>Desktop controls:</strong> Arrow keys or WASD.
            </DialogDescription>
            <Button onClick={() => setIsTutorialOpen(false)}>Play</Button>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={gameOver}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Game Over!</DialogTitle>
            <DialogDescription>
              Longest word: {longestWordData.word}
            </DialogDescription>
            <Button onClick={() => alert("Need to do")}>Play Again?</Button>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Game;
