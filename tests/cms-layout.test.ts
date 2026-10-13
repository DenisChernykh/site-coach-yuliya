import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyBlockCopy,
  defaultPageLayouts,
} from '../src/entities/cms/model/layout';
test('published sections default to the existing order and remain visible', () => {
  const pages = defaultPageLayouts();
  assert.equal(pages.length, 5);
  assert.ok(
    pages.every(
      (p) => p.blocks[0]?.id === 'hero' && p.blocks.every((b) => b.enabled),
    ),
  );
  assert.deepEqual(
    pages[0]?.blocks.slice(0, 4).map((b) => b.id),
    ['hero', 'concerns', 'about', 'approach'],
  );
});
test('section text is escaped and leaves surrounding markup and original defaults intact', () => {
  const html =
    '<section><h2 class="title" data-cms-copy="title">Hello<br>world</h2><p>Unchanged</p></section>';
  assert.equal(applyBlockCopy(html, { id: 'hero', enabled: true }), html);
  const result = applyBlockCopy(html, {
    id: 'hero',
    enabled: true,
    title: '<script>alert("x")</script>\n$&',
  });
  assert.ok(!result.includes('<script>'));
  assert.ok(result.includes('&lt;script&gt;'));
  assert.ok(result.includes('\n$&'));
  assert.ok(result.includes('<p>Unchanged</p>'));
});
