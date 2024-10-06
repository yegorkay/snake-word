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
import { isVowel } from "./utils/is-vowel";
import { Play, Pause } from "lucide-react";
import { useScore } from "./store/score";

const cellTypeColorMap = {
  collision: "bg-red-500",
  empty: "bg-cyan-800",
  letter: "bg-yellow-400",
  snake: "bg-zinc-200",
} as { [type in CellType["type"]]: string };

const cellTypeTextColorMap = {
  collision: "text-red-900",
  empty: "text-white",
  letter: "text-yellow-900",
  snake: "text-slate-700",
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
  const { grid, snake, direction } = useGridStore();

  const directionClass = getDirection(direction.direction);
  const snakeHead = snake[0];
  const snakeLength = snake.length - 1;

  // perhaps a slightly faster lookup helps alleviate some slowness
  const snakeMap = useMemo(() => {
    const map = new Map<string, number>();
    snake.forEach((cell, index) => {
      map.set(`${cell.coordinates.x},${cell.coordinates.y}`, index);
    });

    return map;
  }, [snake]);

  return (
    <div
      style={{
        gridTemplateColumns: `repeat(${gameConfig.COLUMN_COUNT}, 1fr)`,
        gridTemplateRows: `repeat(${gameConfig.ROW_COUNT}, 1fr)`,
      }}
      className="border-2 border-cyan-800 rounded-lg grid gap-1 w-full max-w-sm p-1"
    >
      {grid.flat().map((cell, index) => {
        const rowIndex = Math.floor(index / gameConfig.COLUMN_COUNT);
        const colIndex = index % gameConfig.COLUMN_COUNT;
        const isSnakeHead =
          rowIndex === snakeHead.coordinates.y &&
          colIndex === snakeHead.coordinates.x;

        const cellType = grid[rowIndex][colIndex].type;

        const isSnakeCell = cellType === "snake";

        const snakeSegmentIndex = snakeMap.get(`${colIndex},${rowIndex}`) ?? 0;

        const cellClass = isSnakeHead
          ? "bg-zinc-700"
          : isSnakeCell
            ? cellTypeColorMap[cellType]
            : cellType === "letter"
              ? isVowel(cell?.letter)
                ? "bg-purple-200"
                : cellTypeColorMap[cellType]
              : cellTypeColorMap[cellType];

        const cellTextClass = isSnakeHead
          ? "text-white"
          : isSnakeCell
            ? "text-slate-900"
            : cellType === "letter"
              ? isVowel(cell?.letter)
                ? "text-purple-900"
                : cellTypeTextColorMap[cellType]
              : cellTypeTextColorMap[cellType];

        // Apply opacity: higher for the first 4 cells, then gradually reduce for longer snakes
        const opacity =
          !isSnakeHead && snakeSegmentIndex > 0
            ? snakeSegmentIndex < 4
              ? 1 // Full opacity for the first 4 cells
              : Math.max(0.1, 1 - (snakeSegmentIndex - 3) / (snakeLength - 3)) // Gradual falloff after the 3th cell
            : 1;

        return (
          <div
            className={`${cellClass} ${isSnakeHead ? "text-white" : ""} rounded-lg relative aspect-square flex justify-center items-center font-bold text-lg text-center ${isSnakeHead ? arrowMap[directionClass] : ""}`.trim()}
            key={index}
          >
            {/* A hack for the game state sometimes rendering a letter on empty tile */}
            {cell?.letter && cell?.type !== "empty" && (
              <span
                className={cellTextClass}
                style={opacity === 1 ? undefined : { opacity }}
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

const Game = () => {
  const {
    snake,
    direction,
    gameOver,
    isTutorialOpen,
    enableMovement,
    snakeSpeed,
    initializeGrid,
    setDirection,
    setIsTutorialOpen,
    toggleEnableMovement,
    moveSnake,
    setGameOver,
    setSnakeSpeed,
    setTimeRemaining,
    timeRemaining,
  } = useGridStore();

  const { highScore, setHighScoreData } = useScore();

  const handlers = useSwipeable({
    onSwiped: (eventData) => {
      if (enableMovement) {
        setDirection(eventData.dir);
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
    () => {
      if (enableMovement) {
        moveSnake();
      }
    },
    gameOver ? null : snakeSpeed,
  );

  useInterval(
    () => {
      if (import.meta.env.DEV) return;

      if (timeRemaining === 0) {
        toggleEnableMovement();
      }
      if (!enableMovement && timeRemaining > 0) {
        setTimeRemaining(timeRemaining - 1000);
      }
    },
    gameOver || timeRemaining === 0 ? null : 1000,
  );

  useEffect(() => {
    if (gameOver) {
      if (foundWords.totalScore > highScore) {
        setHighScoreData({ highScore: foundWords.totalScore });
      }
    }
  }, [gameOver, foundWords.totalScore, highScore, setHighScoreData]);

  return (
    <div
      {...handlers}
      className="px-3 py-1 flex flex-col items-center h-svh max-w-screen-md mx-auto bg-cyan-700"
    >
      <div className="my-2 flex gap-2 items-center justify-between w-full">
        <ScrollArea className="whitespace-nowrap rounded-md border border-cyan-800 min-w-52">
          <ul className="flex w-max space-x-1 p-1">
            {foundWords.words.length > 0 ? (
              foundWords.words.map((wordObj, index) => (
                <li key={index} className="p-1">
                  <span className="font-semibold text-white">
                    {wordObj.word}
                  </span>
                  <span className="text-sm text-white ml-2">
                    ({wordObj.score})
                  </span>
                </li>
              ))
            ) : (
              <li className="p-1 font-semibold text-white">Snakes & Letters</li>
            )}
          </ul>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <div className="flex gap-2 bg-cyan-700">
          {foundWords.totalScore > 0 && (
            <div className="flex font-extrabold text-green-800 items-center px-2 border rounded-md bg-white">
              {foundWords.totalScore}
            </div>
          )}
          <Button
            onClick={() => toggleEnableMovement()}
            disabled={
              import.meta.env.DEV
                ? false
                : timeRemaining === 0 || direction.direction === undefined
            }
          >
            {!enableMovement ? <Play size={18} /> : <Pause size={18} />}
            {import.meta.env.DEV ? " (dev)" : ` (${timeRemaining / 1000}s)`}
          </Button>
        </div>
      </div>
      <Grid />

      <Dialog
        open={highScore > 0 ? false : isTutorialOpen}
        onOpenChange={() => setIsTutorialOpen(!isTutorialOpen)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Snakes & Letters - Tutorial</DialogTitle>
            <DialogDescription>
              The goal of the game is to build as many words as you can with
              your snake. You can pause the snake at any point, but time will
              run out. The longer the words you build, the higher the score.
            </DialogDescription>
            <div className="flex align-center items-center gap-2 sm:justify-start justify-center">
              <span className="font-semibold text-base">Vowels</span>
              <span
                className={
                  "bg-purple-200 text-purple-900 h-9 w-9 rounded-lg relative aspect-square flex justify-center items-center font-bold text-lg text-center"
                }
              >
                A
              </span>
              <span className="font-semibold text-base">Consonants</span>
              <span
                className={
                  "bg-yellow-400 text-yellow-900 h-9 w-9 rounded-lg relative aspect-square flex justify-center items-center font-bold text-lg text-center"
                }
              >
                B
              </span>
            </div>
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

            {highScore > 0 && (
              <>
                <DialogDescription className="font-extrabold">
                  All Time High Score:
                </DialogDescription>
                <DialogDescription className="flex justify-center mt-0">
                  {Math.max(foundWords.totalScore, highScore)}
                </DialogDescription>
              </>
            )}

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
