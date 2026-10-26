import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import type { CaseStudyDto } from '@/entities/site';
import { StoryDialog } from '@/features/read-story';
import { withBase } from '@/shared/routes';
import styles from './case-studies.module.css';

const covers = [
  {
    src: '/articles/showing-up.webp',
    alt: 'Записи в блокноте за рабочим столом',
  },
  {
    src: '/articles/finding-your-work.webp',
    alt: 'Размышления у окна с открытым блокнотом',
  },
  {
    src: '/articles/social-media-practice.webp',
    alt: 'Блокнот и фотографии для планирования',
  },
];
const coverIndexes: Record<string, number> = {
  'study-direction': 0,
  'finding-direction': 1,
  'career-or-business': 2,
  career: 1,
  voice: 2,
};

export function CaseStudies({
  items,
  mediaBaseUrl,
}: {
  items: CaseStudyDto[];
  mediaBaseUrl?: string;
}) {
  const visible = items.filter((item) => item.enabled !== false);
  const rail = useRef<HTMLDivElement>(null);
  const [navigation, setNavigation] = useState({
    previous: false,
    next: false,
  });
  useEffect(() => {
    const node = rail.current;
    if (!node) return;
    const update = () =>
      setNavigation({
        previous: node.scrollLeft > 8,
        next: node.scrollLeft + node.clientWidth < node.scrollWidth - 8,
      });
    const observer = new ResizeObserver(update);
    observer.observe(node);
    node.addEventListener('scroll', update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      node.removeEventListener('scroll', update);
    };
  }, [visible.length]);
  const scroll = (direction: number) => {
    const node = rail.current;
    if (!node) return;
    const card = node.firstElementChild;
    node.scrollBy({
      left:
        direction *
        ((card?.getBoundingClientRect().width ?? node.clientWidth) + 24),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  };
  return (
    <div>
      <div ref={rail} className={styles.rail} aria-label="Кейсы клиентов">
        {visible.map((story, index) => {
          const cover =
            covers[coverIndexes[story.id] ?? index % covers.length]!;
          return (
            <article key={story.id} className={styles.item}>
              <StoryDialog
                story={story}
                mediaBaseUrl={mediaBaseUrl}
                triggerClassName={styles.card}
              >
                <img
                  src={withBase(cover.src)}
                  alt={cover.alt}
                  width="600"
                  height="400"
                  loading="lazy"
                />
                <span className={styles.body}>
                  <span className={styles.title}>{story.title}</span>
                  <span className={styles.action}>
                    Открыть кейс <ArrowUpRight size={18} aria-hidden="true" />
                  </span>
                </span>
              </StoryDialog>
            </article>
          );
        })}
      </div>
      {(navigation.previous || navigation.next) && (
        <div className={styles.controls}>
          <button
            type="button"
            onClick={() => scroll(-1)}
            disabled={!navigation.previous}
            aria-label="Предыдущие кейсы"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            disabled={!navigation.next}
            aria-label="Следующие кейсы"
          >
            <ArrowRight size={20} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
