import type { CellType } from "@/types";

export function getTopLetters(data: CellType[], count = 3): string[] {
  const letterFrequency: { [key: string]: number } = {};

  // Loop through the array and count the frequency of each letter
  data.forEach((item) => {
    const letter = item.letter;
    if (letter) {
      letterFrequency[letter] = (letterFrequency[letter] || 0) + 1;
    }
  });

  // Convert the frequency object to an array of [letter, count] pairs
  const sortedLetters = Object.entries(letterFrequency).sort(
    (a, b) => b[1] - a[1],
  ); // Sort by frequency in descending order

  // Get the top three letters
  return sortedLetters.slice(0, count).map(([letter]) => letter);
}
