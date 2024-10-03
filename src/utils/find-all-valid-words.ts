import type { CellType } from "@/types";

function getLettersFromSnake(snake: CellType[]) {
  const letters = snake.map((segment) => segment.letter);
  const potentialWord = letters.join("").toLowerCase();

  return { letters, potentialWord };
}

function calculateWordScore(wordLength: number): number {
  // Scoring system:
  // 3 letters: 1 point
  // 4 letters: 3 points
  // 5 letters: 6 points
  // 6 letters: 10 points
  // 7+ letters: 15 points + 2 for each additional letter
  if (wordLength < 3) return 1;
  if (wordLength === 3) return 2;
  if (wordLength === 4) return 3;
  if (wordLength === 5) return 6;
  if (wordLength === 6) return 10;
  return 15 + (wordLength - 7) * 2;
}

export function findAllValidWords(
  snakeSegments: CellType[],
  validWordSet: Set<string> | undefined,
) {
  const { potentialWord } = getLettersFromSnake(snakeSegments);
  const validWords: {
    word: string;
    coordinates: CellType["coordinates"][];
    score: number;
  }[] = [];

  let totalScore = 0;
  let totalLetters = 0;

  // Check all possible substrings
  for (let start = 0; start < potentialWord.length; start++) {
    for (let end = start + 2; end <= potentialWord.length; end++) {
      const substring = potentialWord.slice(start, end);
      // Check if the substring is in the validWordSet and is at least 2 characters long
      if (validWordSet?.has(substring)) {
        const score = calculateWordScore(substring.length);

        validWords.push({
          word: substring,
          coordinates: snakeSegments
            .slice(start, end)
            .map((segment) => segment.coordinates),
          score: score,
        });

        totalScore += score;
        totalLetters += substring.length;
      }
    }
  }

  return {
    words: validWords,
    totalScore,
    totalLetters,
  };
}
