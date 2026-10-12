import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { MessageCircle, X } from 'lucide-react';
import type { SocialLinkDto } from '@/entities/social-link';
import { Button } from '@/shared/ui';
import styles from './social-links.module.css';
import overflowStyles from './social-links-overflow.module.css';

export function SocialLinks({ items: supplied }: { items: SocialLinkDto[] }) {
  const items = supplied.filter((item) => item.url);
  const [overflow, setOverflow] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const openedByHover = useRef(false);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    function resize() {
      const computed = window.getComputedStyle(panel!);
      const size = parseFloat(computed.getPropertyValue('--social-size'));
      const bottom = parseFloat(computed.bottom);
      const height = (items.length + 1) * size + items.length * 10 + 12;
      setOverflow(height > window.innerHeight - bottom - 16);
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [items.length]);

  useEffect(() => {
    if (!expanded) return;
    function closeOutside(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !panelRef.current?.contains(event.target)
      ) {
        openedByHover.current = false;
        setExpanded(false);
      }
    }
    document.addEventListener('pointerdown', closeOutside, { passive: true });
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [expanded]);

  if (!items.length) return null;
  return (
    <div
      ref={panelRef}
      className={`${styles.panel} ${overflow ? overflowStyles.panel : ''}`}
      data-expanded={expanded}
      style={{ '--social-count': items.length } as CSSProperties}
      onPointerEnter={(event) => {
        if (
          event.pointerType === 'mouse' &&
          window.matchMedia('(hover: hover) and (min-width: 768px)').matches &&
          !expanded
        ) {
          openedByHover.current = true;
          setExpanded(true);
        }
      }}
      onPointerLeave={(event) => {
        if (
          event.pointerType === 'mouse' &&
          !event.currentTarget.contains(document.activeElement)
        ) {
          openedByHover.current = false;
          setExpanded(false);
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          openedByHover.current = false;
          setExpanded(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          openedByHover.current = false;
          setExpanded(false);
          triggerRef.current?.focus();
          event.stopPropagation();
        }
      }}
    >
      <div
        id={`${id}-links`}
        aria-hidden={!expanded}
        aria-label="Социальные сети"
        role="group"
        className={overflowStyles.links}
      >
        <div className={overflowStyles.column}>
          {items.map((item, index) => (
            <a
              key={item.id}
              href={item.url!}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.item}
              style={
                {
                  '--social-index': items.length - index,
                  '--icon-url': `url('/icons/${item.id}.svg')`,
                } as CSSProperties
              }
              tabIndex={expanded ? 0 : -1}
              aria-label={item.label}
              title={item.label}
            >
              <span className={styles.icon} aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>
      <Button
        ref={triggerRef}
        variant="outline"
        size="icon-lg"
        className={`${styles.item} ${styles.trigger}`}
        aria-label={expanded ? 'Закрыть соцсети' : 'Открыть соцсети'}
        aria-expanded={expanded}
        aria-controls={`${id}-links`}
        onClick={() => {
          if (openedByHover.current) {
            openedByHover.current = false;
            setExpanded(true);
          } else {
            openedByHover.current = false;
            setExpanded((value) => !value);
          }
        }}
      >
        {expanded ? (
          <X className="size-7" aria-hidden="true" />
        ) : (
          <MessageCircle className="size-7" aria-hidden="true" />
        )}
      </Button>
    </div>
  );
}
