import type { CellType } from "@/types";

function getLettersFromSnake(snake: CellType[]) {
  const letters = snake.map((segment) => segment.letter);
  const potentialWord = letters.join("").toLowerCase();

  return { letters, potentialWord };
}

export function findLongestValidWordAtEnd(
  snakeSegments: CellType[],
  validWordSet: Set<string> | undefined,
) {
  // Get letters in the order they appear in the snake
  const { potentialWord } = getLettersFromSnake(snakeSegments);

  let longestWord = ""; // Initialize a variable to hold the longest word
  let longestWordCoordinates: CellType["coordinates"][] = [];

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
