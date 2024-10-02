type Coordinate = { x: number; y: number };

export type CellType = {
  type: "empty" | "snake" | "letter" | "collision";
  coordinates: Coordinate;
  letter?: string;
};
