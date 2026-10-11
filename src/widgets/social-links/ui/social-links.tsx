import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { MessageCircle, X } from 'lucide-react';
import type { SocialLinkDto } from '@/entities/social-link';
import { Button } from '@/shared/ui';
import styles from './social-links.module.css';

export function SocialLinks({ items }: { items: SocialLinkDto[] }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!expanded) return;
    function closeOutside(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !panelRef.current?.contains(event.target)
      ) {
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
      className={styles.panel}
      data-expanded={expanded}
      style={{ '--social-count': items.length } as CSSProperties}
      onPointerEnter={(event) => {
        if (
          event.pointerType === 'mouse' &&
          window.matchMedia('(hover: hover) and (min-width: 768px)').matches
        ) {
          setExpanded(true);
        }
      }}
      onPointerLeave={(event) => {
        if (
          event.pointerType === 'mouse' &&
          !event.currentTarget.contains(document.activeElement)
        ) {
          setExpanded(false);
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setExpanded(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
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
      >
        {items.map((item, index) => (
          <Button
            key={item.id}
            variant="outline"
            size="icon-lg"
            className={styles.item}
            style={
              {
                '--social-index': items.length - index,
                '--icon-url': `url('/icons/${item.id}.svg')`,
              } as CSSProperties
            }
            nativeButton={!item.url}
            render={
              item.url ? (
                <a href={item.url} target="_blank" rel="noopener noreferrer" />
              ) : undefined
            }
            disabled={!item.url}
            tabIndex={expanded && item.url ? 0 : -1}
            aria-label={
              item.url
                ? item.label
                : `${item.label} — профиль пока не подключён`
            }
            title={
              item.url
                ? item.label
                : `${item.label} — профиль пока не подключён`
            }
          >
            <span className={styles.icon} aria-hidden="true" />
          </Button>
        ))}
      </div>
      <Button
        ref={triggerRef}
        variant="outline"
        size="icon-lg"
        className={`${styles.item} ${styles.trigger}`}
        aria-label={expanded ? 'Закрыть соцсети' : 'Открыть соцсети'}
        aria-expanded={expanded}
        aria-controls={`${id}-links`}
        onClick={() => setExpanded((value) => !value)}
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
