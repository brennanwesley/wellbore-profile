export function parseCoordinateText(inputText) {
  if (!inputText?.trim()) {
    return [];
  }

  return inputText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(",").map((value) => Number(value.trim())))
    .filter((parts) => parts.length === 3 && parts.every((value) => Number.isFinite(value)))
    .map(([x, y, z]) => ({ x, y, z }));
}
