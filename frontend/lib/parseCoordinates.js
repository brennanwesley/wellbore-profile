export function parseCoordinateText(inputText) {
  if (!inputText?.trim()) {
    return [];
  }

  return inputText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^"(.*)"$/, "$1"))
    .map((line) =>
      line
        .split(",")
        .map((value) => value.trim().replace(/^"(.*)"$/, "$1"))
        .map((value) => Number(value)),
    )
    .filter((parts) => parts.length === 3 && parts.every((value) => Number.isFinite(value)))
    .map(([x, y, z]) => ({ x, y, z }));
}
