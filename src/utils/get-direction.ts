import { gameConfig } from "@/config";

export function getDirection(
  direction: keyof typeof gameConfig.directionsMap | undefined,
) {
  switch (direction) {
    case "Up":
    case "arrowup":
    case "w":
      return "up";
    case "Down":
    case "arrowdown":
    case "s":
      return "down";
    case "Left":
    case "arrowleft":
    case "a":
      return "left";
    case "Right":
    case "arrowright":
    case "d":
      return "right";
    default:
      return "";
  }
}
