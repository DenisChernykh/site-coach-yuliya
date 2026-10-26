import type { HomePageDto } from '@/shared/api';
import { DocumentDialog } from '@/features/read-document';
import { contentImageUrl } from '@/shared/lib/content-image';
import styles from './education.module.css';

export function Education({
  items,
  mediaBaseUrl,
}: {
  items: NonNullable<HomePageDto['education']>;
  mediaBaseUrl?: string;
}) {
  const visible = items.filter((item) => item.enabled);
  if (!visible.length) return null;
  return (
    <div className={styles.grid}>
      {visible.map((item) => {
        const image = contentImageUrl(item.image, mediaBaseUrl);
        return (
          <article key={item.id} className={styles.card}>
            {image && (
              <img
                src={contentImageUrl(item.image, mediaBaseUrl, 'mobile')}
                alt={item.imageAlt}
                loading="lazy"
                width={1179}
                height={828}
                className={styles.image}
              />
            )}
            <div className={styles.copy}>
              <p className="eyebrow">
                {item.organization} · {item.year}
              </p>
              <h3>{item.title}</h3>
              <p className={styles.type}>{item.documentType}</p>
              <p className={styles.hours}>{item.hours} ч. обучения</p>
              <DocumentDialog
                image={image}
                imageAlt={item.imageAlt}
                title={item.title}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}
