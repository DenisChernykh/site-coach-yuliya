type PointerPosition = { x: number; y: number; time: number };

export function storyGestureDirection(
  start: PointerPosition,
  end: PointerPosition,
  bounds: { left: number; width: number },
): 'next' | 'previous' | undefined {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
    return dx < 0 ? 'next' : 'previous';
  }
  if (end.time - start.time > 250 || Math.abs(dx) > 10 || Math.abs(dy) > 10) {
    return;
  }
  return end.x < bounds.left + bounds.width / 2 ? 'previous' : 'next';
}
