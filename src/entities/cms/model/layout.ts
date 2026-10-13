import type { CmsBlockDto } from '@/shared/api';

import { defaultPageLayouts } from '@/shared/lib/page-layouts';
export { defaultPageLayouts };
export type { CmsPageKey } from '@/shared/lib/page-layouts';
export const escapeHtml = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
export function applyBlockCopy(html: string, block: CmsBlockDto): string {
  for (const field of ['title', 'description', 'eyebrow', 'note'] as const) {
    if (block[field] === undefined) continue;
    const pattern = new RegExp(
      '<(h[1-6]|p)([^>]*data-cms-copy="' + field + '"[^>]*)>[\\s\\S]*?<\\/\\1>',
      'g',
    );
    html = html.replace(
      pattern,
      (_match, tag: string, attributes: string) =>
        '<' +
        tag +
        attributes +
        ' style="white-space:pre-line">' +
        escapeHtml(block[field]!) +
        '</' +
        tag +
        '>',
    );
  }
  return html;
}
