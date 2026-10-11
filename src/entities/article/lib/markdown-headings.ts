export function markdownHeadings(
  markdown: string,
): { id: string; title: string }[] {
  const headings: { id: string; title: string }[] = [];
  let fence = false;
  for (const line of markdown.split('\n')) {
    if (/^\s*(```|~~~)/u.test(line)) {
      fence = !fence;
      continue;
    }
    const match = !fence && /^##\s+(.+?)\s*#*$/u.exec(line);
    if (match)
      headings.push({
        id: `article-heading-${headings.length + 1}`,
        title: match[1]!.replace(/[*_`]/gu, ''),
      });
  }
  return headings;
}
