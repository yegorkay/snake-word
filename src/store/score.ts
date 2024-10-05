import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const useScore = create<{
  highScore: number;
  setHighScoreData: ({ highScore }: { highScore: number }) => void;
}>()(
  persist(
    (set) => ({
      highScore: 0,
      setHighScoreData: ({ highScore }) => set({ highScore }),
    }),
    {
      name: "snakes-letters-high-score-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
