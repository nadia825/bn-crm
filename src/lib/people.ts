/** Local, fictional headshots for the built-in demo identities. */
export const teamPortraitAtlas = {
  src: "/people/demo-team-headshots.webp",
  width: 1774,
  height: 887,
  columns: 4,
  rows: 2,
};
const portraitNames = [
  "Olivia Parker", "James Wilson", "Sofia Chen", "Marcus Reed",
  "Avery Lane", "Taylor Morgan", "Riley Brooks", "Maya Robinson",
];
export function personPortrait(name: string) {
  const index = portraitNames.findIndex((person) => person.toLowerCase() === name.trim().toLowerCase());
  if (index < 0) return undefined;
  const width = teamPortraitAtlas.width / teamPortraitAtlas.columns;
  const height = teamPortraitAtlas.height / teamPortraitAtlas.rows;
  return { x: index % teamPortraitAtlas.columns * width, y: Math.floor(index / teamPortraitAtlas.columns) * height, width, height };
}
