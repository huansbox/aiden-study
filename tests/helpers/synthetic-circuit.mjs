import { syntheticPngData } from "./synthetic-study-pack.mjs";
export const circuitQuestion = () => ({
  id: "science-g4s1-synthetic-circuit-v1", subject: "science", unit: 30, type: "circuit_connect",
  text: "Synthetic: place one cell and connect two wires.", subtopic: "Synthetic circuit", source: "Synthetic",
  options: [], answer: "closed", material: { kind: "png", data: syntheticPngData(), alt: "Synthetic bulb" },
  circuit: { terminals: [
    { id: "battery-positive", x: 250, y: 280 }, { id: "battery-negative", x: 250, y: 460 },
    { id: "bulb-glass", x: 735, y: 197 }, { id: "bulb-shell", x: 802, y: 353 }, { id: "bulb-base", x: 735, y: 439 },
  ] },
});
