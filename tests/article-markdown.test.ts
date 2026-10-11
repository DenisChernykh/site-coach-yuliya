import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MarkdownArticleBody } from '../src/entities/article/ui/markdown-article-body';
import { markdownHeadings } from '../src/entities/article/lib/markdown-headings';

test('formatted article renders headings, emphasis, lists and safe links', () => {
  const html = renderToStaticMarkup(
    createElement(MarkdownArticleBody, {
      markdown:
        '## Заголовок\n\n**Важный** текст.\n\n- Первый\n- Второй\n\n[Ссылка](https://example.com)',
    }),
  );
  assert.match(html, /id="article-heading-1"/);
  assert.match(html, /<strong>Важный<\/strong>/);
  assert.match(html, /<ul>/);
  assert.match(html, /href="https:\/\/example.com"/);
});

test('raw HTML and script links from article content cannot execute', () => {
  const html = renderToStaticMarkup(
    createElement(MarkdownArticleBody, {
      markdown:
        '<script>alert(1)</script>\n\n<img src=x onerror=alert(2)>\n\n[Опасная ссылка](javascript:alert%281%29)\n\n![Изображение](https://example.com/tracker.png)',
    }),
  );
  assert.doesNotMatch(html, /<script|<img|onerror|href="javascript:/);
});

test('article contents ignore headings inside code blocks', () => {
  assert.deepEqual(
    markdownHeadings('## Первый\n\n```\n## Не заголовок\n```\n\n## Второй'),
    [
      { id: 'article-heading-1', title: 'Первый' },
      { id: 'article-heading-2', title: 'Второй' },
    ],
  );
});
