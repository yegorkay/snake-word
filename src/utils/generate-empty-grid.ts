import type { CellType } from "@/types";

export function generateEmptyGrid(
  ROW_COUNT: number,
  COL_COUNT: number,
): CellType[][] {
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
