export function isVowel(letter: string | undefined) {
  if (letter === undefined) return false;

  const vowels = new Set(["A", "E", "I", "O", "U", "Y"]);

  return vowels.has(letter);
}
