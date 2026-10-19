import assert from 'node:assert/strict';
import { test } from 'node:test';
import { storyGestureDirection } from '../src/widgets/stories/model/navigation';

const bounds = { left: 200, width: 400 };

test('quick taps navigate by the left or right half of the viewer', () => {
  for (const [x, direction] of [
    [250, 'previous'],
    [550, 'next'],
  ] as const) {
    assert.equal(
      storyGestureDirection(
        { x, y: 300, time: 0 },
        { x, y: 300, time: 120 },
        bounds,
      ),
      direction,
    );
  }
});

test('releasing a hold or a vertical drag does not skip the story', () => {
  const start = { x: 550, y: 300, time: 0 };
  for (const end of [
    { ...start, time: 600 },
    { x: 555, y: 370, time: 120 },
    { x: 490, y: 390, time: 120 },
    { x: 570, y: 300, time: 120 },
  ]) {
    assert.equal(storyGestureDirection(start, end, bounds), undefined);
  }
});

test('horizontal swipes still navigate in either direction, even after holding', () => {
  const start = { x: 400, y: 300, time: 0 };
  assert.equal(
    storyGestureDirection(start, { x: 310, y: 310, time: 500 }, bounds),
    'next',
  );
  assert.equal(
    storyGestureDirection(start, { x: 490, y: 300, time: 180 }, bounds),
    'previous',
  );
});
