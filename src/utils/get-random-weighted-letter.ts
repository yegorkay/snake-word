import { gameConfig } from "@/config";

export function getRandomWeightedLetter() {
  const totalWeight = Object.values(gameConfig.letterWeights).reduce(
    (sum, weight) => sum + weight,
    0,
  );
  const random = Math.random() * totalWeight;

  let cumulativeWeight = 0;
  for (const [letter, weight] of Object.entries(gameConfig.letterWeights)) {
    cumulativeWeight += weight;
    if (random < cumulativeWeight) {
      return letter;
    }
  }

  return "A";
}
