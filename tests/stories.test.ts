import assert from 'node:assert/strict';
import { test } from 'node:test';
import { storyEntries } from '../src/widgets/stories/model/stories';
import type { StoryGroupDto } from '../src/shared/api';

test('viewer follows collection and slide order, skips hidden content and empty collections', () => {
  const slide = {
    id: 'a',
    mediaId: 'photo',
    type: 'image' as const,
    caption: '',
    durationSeconds: 5,
    enabled: true,
    linkUrl: '',
    linkLabel: '',
  };
  const group: StoryGroupDto = {
    id: 'one',
    title: 'Знакомство',
    enabled: true,
    coverMediaId: 'cover',
    slides: [
      slide,
      { ...slide, id: 'hidden', enabled: false },
      { ...slide, id: 'b' },
    ],
  };
  const entries = storyEntries([
    { ...group, id: 'empty', slides: [] },
    { ...group, id: 'hidden-group', enabled: false },
    group,
    { ...group, id: 'two', slides: [{ ...slide, id: 'c' }] },
  ]);
  assert.deepEqual(
    entries.map(({ group, slide, position, slides }) => [
      group.id,
      slide.id,
      position,
      slides.length,
    ]),
    [
      ['one', 'a', 0, 2],
      ['one', 'b', 1, 2],
      ['two', 'c', 0, 1],
    ],
  );
  assert.equal(group.slides.length, 3);
});
