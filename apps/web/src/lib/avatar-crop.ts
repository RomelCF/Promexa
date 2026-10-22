export function squareCrop(width: number, height: number, zoom: number, x: number, y: number) {
  const clamp = (value: number) => Math.max(-1, Math.min(1, value));
  const side = Math.min(width, height) / Math.max(1, Math.min(3, zoom));
  return { x: (width - side) * (clamp(x) + 1) / 2,
    y: (height - side) * (clamp(y) + 1) / 2, side };
}
