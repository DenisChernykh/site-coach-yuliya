import assert from 'node:assert/strict';
import { test } from 'node:test';
import { storyGesture } from '../src/widgets/stories/model/navigation';

const bounds = { left: 200, width: 400 };

test('quick taps navigate by the left or right half of the viewer', () => {
  for (const [x, direction] of [
    [250, 'previous'],
    [550, 'next'],
  ] as const) {
    assert.deepEqual(
      storyGesture({ x, y: 300, time: 0 }, { x, y: 300, time: 120 }, bounds),
      { target: 'slide', direction },
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
    assert.equal(storyGesture(start, end, bounds), undefined);
  }
});

test('horizontal swipes change collections in either direction, even after holding', () => {
  const start = { x: 400, y: 300, time: 0 };
  assert.deepEqual(storyGesture(start, { x: 310, y: 310, time: 500 }, bounds), {
    target: 'group',
    direction: 'next',
  });
  assert.deepEqual(storyGesture(start, { x: 490, y: 300, time: 180 }, bounds), {
    target: 'group',
    direction: 'previous',
  });
});
