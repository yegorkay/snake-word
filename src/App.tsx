import { useEffect, useMemo } from "react";
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
import { gameConfig } from "@/config";
import { useGridStore } from "@/store/grid";
import type { CellType } from "@/types";
import { findAllValidWords } from "@/utils/find-all-valid-words";
import { getDirection } from "@/utils/get-direction";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { getTopLetters } from "./utils/get-top-letters";

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
  [key in ReturnType<typeof getDirection>]: string;
};

// A functional component that renders the grid
const Grid = () => {
  const { grid, snake, direction, flashingLetter } = useGridStore();

  const directionClass = getDirection(direction.direction);
  const snakeHead = snake[0];

  return (
    <div
      style={{
        gridTemplateColumns: `repeat(${gameConfig.COLUMN_COUNT}, 1fr)`,
        gridTemplateRows: `repeat(${gameConfig.ROW_COUNT}, 1fr)`,
      }}
      className="border-slate-400 border-2 grid gap-1 w-full max-w-sm p-1"
    >
      {grid.flat().map((cell, index) => {
        const rowIndex = Math.floor(index / gameConfig.COLUMN_COUNT);
        const colIndex = index % gameConfig.COLUMN_COUNT;
        const isSnakeHead =
          rowIndex === snakeHead.coordinates.y &&
          colIndex === snakeHead.coordinates.x;

        const cellClass = cellTypeColorMap[grid[rowIndex][colIndex].type];

        const isValidWordCell = false;

        const isFlashingCell = Boolean(
          flashingLetter &&
            rowIndex === flashingLetter.coordinates.y &&
            colIndex === flashingLetter.coordinates.x,
        );

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

const Game = () => {
  const {
    snake,
    direction,
    gameOver,
    isTutorialOpen,
    flashingLetter,
    enableMovement,
    snakeSpeed,
    initializeGrid,
    setDirection,
    setIsTutorialOpen,
    toggleEnableMovement,
    moveSnake,
    selectRandomLetter,
    changeRandomLetter,
    setGameOver,
    setSnakeSpeed,
    setTimeRemaining,
    timeRemaining,
  } = useGridStore();

  const handlers = useSwipeable({
    onSwiped: (eventData) => setDirection(eventData.dir),
  });

  const { data: validWordSet } = useQuery({
    queryFn: () =>
      fetch("./2of12.txt")
        .then((d) => d.text())
        .then((txt) => new Set(txt.split(/\r?\n/))),
    queryKey: ["words"],
    staleTime: Infinity,
  });

  const reverseSnake = useMemo(() => [...snake].slice().reverse(), [snake]);

  const foundWords = useMemo(
    () => findAllValidWords(reverseSnake, validWordSet),
    [validWordSet, reverseSnake],
  );

  useEffect(() => {
    initializeGrid();
  }, [initializeGrid]);

  useEffect(() => {
    setSnakeSpeed(gameConfig.SNAKE_SPEED_IN_MS - foundWords.words.length * 12);
  }, [setSnakeSpeed, foundWords]);

  // Update snake position on grid and handle movement
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key =
        event.key.toLowerCase() as keyof typeof gameConfig.directionsMap;
      const newDirection = gameConfig.directionsMap[key];

      if (newDirection) {
        // Prevent reversing direction
        if (
          (direction.coordinates.x === 0 && newDirection.x !== 0) ||
          (direction.coordinates.y === 0 && newDirection.y !== 0)
        ) {
          setDirection(key);
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
  }, [direction, moveSnake, enableMovement, gameOver, setDirection]);

  useInterval(
    () => selectRandomLetter(),
    !gameOver && enableMovement
      ? gameConfig.FLASH_DURATION + gameConfig.CHANGE_RANDOM_LETTER_DURATION
      : null, // Select a new letter every 4 seconds
  );

  useInterval(
    () => {
      if (!gameOver && enableMovement && flashingLetter) {
        changeRandomLetter();
      }
    },
    !gameOver && enableMovement && flashingLetter
      ? gameConfig.CHANGE_RANDOM_LETTER_DURATION
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

  useInterval(
    () => {
      if (timeRemaining === 0) {
        toggleEnableMovement();
      }
      if (!enableMovement && timeRemaining > 0) {
        setTimeRemaining(timeRemaining - 1000);
      }
    },
    gameOver || timeRemaining === 0 ? null : 1000,
  );

  return (
    <div
      {...handlers}
      className="p-4 flex flex-col items-start sm:items-center h-svh"
    >
      {JSON.stringify(snakeSpeed)}

      <Grid />

      <div className="w-full my-2 flex flex-col gap-2">
        <div className="flex flex-row items-center justify-center gap-6">
          <h3 className="text-xl font-extrabold text-center">
            Score: {foundWords.totalScore}
          </h3>

          <Button
            onClick={() => toggleEnableMovement()}
            disabled={timeRemaining === 0 || direction.direction === undefined}
          >
            {!enableMovement ? "Start Snake" : "Pause Snake"} (
            {timeRemaining / 1000}s)
          </Button>
        </div>

        {foundWords.words.length > 0 && (
          <ScrollArea className="whitespace-nowrap rounded-md border">
            <ul className="flex w-max space-x-4 p-4">
              {foundWords.words.map((wordObj, index) => (
                <li key={index} className="p-1">
                  <span className="font-medium">{wordObj.word}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({wordObj.score})
                  </span>
                </li>
              ))}
            </ul>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </div>

      <Dialog
        open={isTutorialOpen}
        onOpenChange={() => setIsTutorialOpen(!isTutorialOpen)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Snakes & Letters - Tutorial</DialogTitle>
            <DialogDescription className="sm:hidden block">
              The goal of the game is to build as many words as you can with
              your snake. You can pause the snake at any point, but time will
              run out. The longer the words you build, the higher the score.
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
            <DialogTitle>
              Game Over! You scored {foundWords.totalScore}
            </DialogTitle>
            <DialogDescription className="font-extrabold">
              Top words:
            </DialogDescription>
            <DialogDescription className="flex justify-center mt-0">
              {[
                ...foundWords.words
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 3),
              ].map((wordObj, index) => (
                <span key={index} className="p-1 block">
                  <span className="font-bold">{wordObj.word}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({wordObj.score})
                  </span>
                </span>
              ))}
            </DialogDescription>

            <DialogDescription className="font-extrabold">
              Starting Letter:
            </DialogDescription>
            <DialogDescription className="flex justify-center mt-0">
              {snake[0]?.letter}
            </DialogDescription>

            <DialogDescription className="font-extrabold">
              Most used letters in snake:
            </DialogDescription>
            <DialogDescription className="flex justify-center mt-0 gap-4">
              {getTopLetters(snake).map((letter, index) => (
                <span className="block" key={`${letter}:${index}:most-used`}>
                  {letter}
                </span>
              ))}
            </DialogDescription>

            <Button
              onClick={() => {
                initializeGrid();
                setGameOver(false);
                setDirection(undefined);
              }}
            >
              Play Again?
            </Button>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Game;
