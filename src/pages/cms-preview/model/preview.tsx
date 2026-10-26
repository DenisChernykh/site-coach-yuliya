import { MobileNavigation } from '@/features/mobile-navigation';
import { ContactSocials } from '@/features/contact-socials';
import { SocialLinks } from '@/widgets/social-links';
import { Stories } from '@/widgets/stories';
import { Education } from '@/widgets/education';
import { CaseStudies } from '@/widgets/case-studies';
import { createRoot, type Root } from 'react-dom/client';
import {
  ArticleCard,
  MarkdownArticleBody,
  markdownHeadings,
} from '@/entities/article';
import { ServiceCard } from '@/entities/service';
import { FaqList } from '@/features/faq';
import type {
  ArticleDto,
  CmsPageDto,
  ContactDetailsDto,
  FaqItemDto,
  HomePageDto,
  ServiceDto,
  SiteSettingsDto,
  SocialLinkDto,
} from '@/shared/api';

interface PreviewDocument {
  site: SiteSettingsDto;
  home: HomePageDto;
  contacts: ContactDetailsDto;
  faq: FaqItemDto[];
  socials: SocialLinkDto[];
  pages: CmsPageDto[];
  articles: { content: ArticleDto; published: boolean; sortOrder: number }[];
  programs: { content: ServiceDto; published: boolean; sortOrder: number }[];
}
const read = (object: unknown, path: string): unknown =>
  path
    .split('.')
    .filter(Boolean)
    .reduce<unknown>(
      (value, key) =>
        value && typeof value === 'object'
          ? (value as Record<string, unknown>)[key]
          : undefined,
      object,
    );
const roots = new WeakMap<Element, Root>();
const listTemplates = new WeakMap<
  HTMLElement,
  { node: HTMLElement; anchor: Comment }
>();
const originalCopy = new WeakMap<HTMLElement, string>();
const fields = (scope: Element, object: unknown, relative = false) => {
  scope.querySelectorAll<HTMLElement>('[data-cms-field]').forEach((node) => {
    const path = node.dataset.cmsField!;
    if (path.startsWith('.') !== relative) return;
    const value =
      read(object, path) ??
      (node.dataset.cmsFallback
        ? read(object, node.dataset.cmsFallback)
        : undefined);
    node.textContent =
      typeof value === 'string' || typeof value === 'number'
        ? String(value)
        : '';
  });
};
const render = (node: Element, children: React.ReactNode) => {
  let root = roots.get(node);
  if (!root) {
    root = createRoot(node);
    roots.set(node, root);
  }
  root.render(children);
};
function lists(scope: Element, document: unknown) {
  scope.querySelectorAll<HTMLElement>('[data-cms-list]').forEach((parent) => {
    let template = listTemplates.get(parent);
    if (!template) {
      const item = parent.querySelector<HTMLElement>(
        ':scope > [data-cms-item]',
      );
      if (!item) return;
      const anchor = window.document.createComment('preview-list');
      parent.insertBefore(anchor, item);
      template = { node: item.cloneNode(true) as HTMLElement, anchor };
      listTemplates.set(parent, template);
    }
    const value = read(document, parent.dataset.cmsList!);
    if (!Array.isArray(value)) return;
    parent
      .querySelectorAll(':scope > [data-cms-item]')
      .forEach((node) => node.remove());
    value
      .filter(
        (item) =>
          !parent.dataset.cmsFilterId || item.id === parent.dataset.cmsFilterId,
      )
      .forEach((item, index) => {
        const node = template!.node.cloneNode(true) as HTMLElement;
        if (node.hasAttribute('data-cms-value'))
          node.textContent =
            (node.dataset.cmsValuePrefix ?? '') + String(item ?? '');
        fields(node, item, true);
        const href = node.dataset.cmsHref
          ? read(item, node.dataset.cmsHref)
          : undefined;
        if (typeof href === 'string' && /^(?:https:\/\/|\/(?!\/)|#)/.test(href))
          node.setAttribute('href', href);
        node.querySelectorAll<HTMLElement>('[data-cms-index]').forEach((n) => {
          n.textContent = String(index + 1).padStart(2, '0');
        });
        if (parent.dataset.cmsLastClass)
          node.classList.toggle(
            parent.dataset.cmsLastClass,
            index === value.length - 1,
          );
        template!.anchor.parentNode!.insertBefore(node, template!.anchor);
      });
  });
}
const legacyMarkdown = (a: ArticleDto) =>
  [
    a.intro,
    a.storyTitle && '## ' + a.storyTitle,
    ...a.story,
    a.quote && '> ' + a.quote,
    a.quoteNote && '_' + a.quoteNote + '_',
    ...a.sections.flatMap((s) => ['## ' + s.title, ...s.paragraphs]),
  ]
    .filter(Boolean)
    .join('\n\n');
export function startPreview() {
  const referrer = window.document.referrer;
  const expected =
    import.meta.env.PUBLIC_CMS_ADMIN_ORIGIN ||
    import.meta.env.PUBLIC_API_BASE_URL;
  if (window.parent === window || !referrer) return;
  const parentOrigin = new URL(referrer).origin;
  const local =
    ['localhost', '127.0.0.1'].includes(new URL(parentOrigin).hostname) &&
    ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (
    parentOrigin !== window.location.origin &&
    parentOrigin !== (expected ? new URL(expected).origin : '') &&
    !local
  )
    return;
  const coverMap = Object.fromEntries(
    [
      ...window.document.querySelectorAll<HTMLMetaElement>(
        'meta[data-cms-cover]',
      ),
    ].map((meta) => [meta.dataset.cmsCover!, meta.content]),
  );
  const normalized = (a: ArticleDto): ArticleDto => ({
    ...a,
    coverImage:
      coverMap[a.coverImage] ??
      (/^(https?:\/\/|\/)/.test(a.coverImage) ? a.coverImage : ''),
  });
  const preventSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  const preventNavigation = (event: MouseEvent) => {
    if ((event.target as Element).closest('a')) event.preventDefault();
  };
  const receive = (event: MessageEvent) => {
    if (
      event.source !== window.parent ||
      event.origin !== parentOrigin ||
      event.data?.type !== 'cms:document'
    )
      return;
    const content = event.data.content as PreviewDocument;
    if (
      !content ||
      !Array.isArray(content.pages) ||
      !content.home ||
      !content.site ||
      !Array.isArray(content.articles) ||
      !Array.isArray(content.programs)
    )
      return;
    const articleInput = event.data.article ?? content.articles[0]?.content;
    const article = articleInput ? normalized(articleInput) : undefined;
    const context = { ...content, article };
    const selected = event.data.page as string;
    window.document
      .querySelectorAll<HTMLElement>('[data-preview-page]')
      .forEach((container) => {
        container.hidden = container.dataset.previewPage !== selected;
        fields(container, context);
        container
          .querySelectorAll<HTMLElement>('[data-cms-no-telegram]')
          .forEach((node) => {
            node.hidden = Boolean(content.contacts.telegramUrl);
          });
        const details =
          container.querySelector<HTMLElement>('.contact-details');
        if (details) {
          details.hidden = !Boolean(
            content.contacts.email ||
            content.contacts.phone ||
            content.contacts.address ||
            content.socials.some((s) => s.url),
          );
          details
            .querySelectorAll<HTMLElement>('address > div')
            .forEach((group) => {
              const field =
                group.querySelector<HTMLElement>('[data-cms-field]');
              if (field) group.hidden = !read(context, field.dataset.cmsField!);
            });
        }
        lists(container, context);
        const page = content.pages.find(
          (p) => p.key === container.dataset.previewPage,
        );
        const parent = container.querySelector('[data-cms-page]');
        if (parent && page) {
          for (const block of page.blocks) {
            const node = [...parent.children].find(
              (n) => (n as HTMLElement).dataset.cmsBlock === block.id,
            ) as HTMLElement | undefined;
            if (!node) continue;
            node.hidden = !block.enabled;
            node.style.display = block.enabled ? 'contents' : 'none';
            parent.append(node);
            node
              .querySelectorAll<HTMLElement>('[data-cms-copy]')
              .forEach((copy) => {
                if (!originalCopy.has(copy))
                  originalCopy.set(copy, copy.innerHTML);
                const key = copy.dataset.cmsCopy as
                  'title' | 'description' | 'eyebrow' | 'note';
                if (block[key] !== undefined) {
                  copy.textContent = block[key];
                  copy.style.whiteSpace = 'pre-line';
                } else if (!copy.dataset.cmsField && !copy.dataset.cmsList)
                  copy.innerHTML = originalCopy.get(copy)!;
              });
          }
        }
        container
          .querySelectorAll<HTMLElement>('[data-cms-react]')
          .forEach((node) => {
            const type = node.dataset.cmsReact;
            if (type === 'education')
              node.closest('section')!.hidden = !(
                content.home.education ?? []
              ).some((item) => item.enabled);
            if (type === 'cases')
              node.closest('section')!.hidden = !content.home.caseStudies.some(
                (item) => item.enabled !== false,
              );
            if (type === 'education')
              render(
                node,
                <Education
                  items={content.home.education ?? []}
                  mediaBaseUrl={parentOrigin}
                />,
              );
            if (type === 'cases')
              render(
                node,
                <CaseStudies
                  items={content.home.caseStudies}
                  mediaBaseUrl={parentOrigin}
                />,
              );
            if (type === 'stories')
              render(
                node,
                <Stories
                  stories={content.home.stories ?? []}
                  mediaBaseUrl={parentOrigin}
                  preview
                />,
              );
            if (type === 'programs')
              render(
                node,
                content.programs
                  .filter((p) => p.published)
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((p) => (
                    <ServiceCard key={p.content.id} service={p.content} />
                  )),
              );
            if (type === 'contact-socials')
              render(
                node,
                <ContactSocials
                  items={content.socials}
                  telegramUrl={content.contacts.telegramUrl}
                />,
              );
            if (type === 'socials')
              render(
                node,
                <SocialLinks
                  items={content.socials}
                  phone={content.contacts.phone}
                />,
              );
            if (type === 'faq') render(node, <FaqList items={content.faq} />);
            if (type === 'articles' || type === 'journal') {
              const all = content.articles
                .filter((a) => a.published)
                .sort((a, b) => a.sortOrder - b.sortOrder);
              render(
                node,
                (type === 'articles' ? all.slice(0, 2) : all).map((a) => (
                  <ArticleCard
                    key={a.content.slug}
                    article={normalized(a.content)}
                    variant={type === 'journal' ? 'row' : 'preview'}
                  />
                )),
              );
            }
            if (type === 'article-body' && article)
              render(
                node,
                <MarkdownArticleBody
                  markdown={article.bodyMarkdown ?? legacyMarkdown(article)}
                />,
              );
          });
        container
          .querySelectorAll<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
          >('form input, form textarea, form select, form button')
          .forEach((control) => {
            control.disabled = true;
          });
        if (container.dataset.previewPage === 'article' && article) {
          const cover =
            container.querySelector<HTMLImageElement>('.article-cover');
          if (cover) {
            cover.src = article.coverImage;
            cover.alt = article.coverAlt;
          }
          const toc = container.querySelector('[data-cms-toc]');
          if (toc) {
            toc.replaceChildren(
              ...markdownHeadings(
                article.bodyMarkdown ?? legacyMarkdown(article),
              ).map((h, i) => {
                const li = window.document.createElement('li'),
                  a = window.document.createElement('a');
                a.href = '#' + h.id;
                a.textContent = String(i + 1).padStart(2, '0') + ' ' + h.title;
                li.append(a);
                return li;
              }),
            );
          }
        }
      });
    window.document
      .querySelectorAll('body > header, body > footer')
      .forEach((node) => {
        fields(node, context);
        lists(node, context);
      });
    for (const field of ['email', 'phone', 'address'] as const) {
      window.document
        .querySelectorAll<HTMLElement>(`[data-cms-field="contacts.${field}"]`)
        .forEach((node) => {
          const value = content.contacts[field] ?? '';
          node.hidden = !value;
          if (node instanceof HTMLAnchorElement) {
            if (field === 'email') node.href = `mailto:${value}`;
            if (field === 'phone')
              node.href = `tel:${value.replace(/[^+\d]/g, '')}`;
          }
        });
    }
    window.document
      .querySelectorAll<HTMLElement>('[data-cms-react="socials"]')
      .forEach((node) =>
        render(
          node,
          <SocialLinks
            items={content.socials}
            phone={content.contacts.phone}
          />,
        ),
      );
    window.document
      .querySelectorAll<HTMLElement>('[data-cms-react="navigation"]')
      .forEach((node) =>
        render(
          node,
          <MobileNavigation
            navigation={content.site.navigation}
            name={content.site.name}
          />,
        ),
      );
    const placeholder = window.document.getElementById('preview-placeholder');
    if (placeholder)
      placeholder.hidden = Boolean(
        window.document.querySelector('[data-preview-page]:not([hidden])'),
      );
    window.parent.postMessage(
      { type: 'cms:rendered', sequence: event.data.sequence },
      parentOrigin,
    );
  };
  window.document.addEventListener('submit', preventSubmit, true);
  window.document.addEventListener('click', preventNavigation, true);
  window.addEventListener('message', receive);
  window.parent.postMessage({ type: 'cms:ready' }, parentOrigin);
  return () => {
    window.document.removeEventListener('submit', preventSubmit, true);
    window.document.removeEventListener('click', preventNavigation, true);
    window.removeEventListener('message', receive);
  };
}
