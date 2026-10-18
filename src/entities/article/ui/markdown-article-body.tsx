import Markdown from 'react-markdown';
import { withBase } from '@/shared/routes';

export function MarkdownArticleBody({ markdown }: { markdown: string }) {
  let heading = 0;
  return (
    <div className="markdown-article-body">
      <Markdown
        skipHtml
        disallowedElements={['img']}
        components={{
          h1: ({ children }) => <h2>{children}</h2>,
          h2: ({ children }) => (
            <h2 id={`article-heading-${++heading}`}>{children}</h2>
          ),
          a: ({ children, href }) => (
            <a href={href ? withBase(href) : href} rel="noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {markdown}
      </Markdown>
    </div>
  );
}
