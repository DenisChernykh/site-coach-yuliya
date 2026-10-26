import type { SocialLinkDto } from '@/entities/social-link';
import { withBase } from '@/shared/routes';
import styles from './contact-socials.module.css';

export function ContactSocials({
  items,
  telegramUrl,
}: {
  items: SocialLinkDto[];
  telegramUrl?: string | null;
}) {
  const links = items
    .map((item) =>
      item.id === 'telegram' && telegramUrl
        ? { ...item, url: telegramUrl, label: 'Написать в Telegram' }
        : item,
    )
    .filter((item) => item.url);
  if (telegramUrl && !links.some((item) => item.id === 'telegram')) {
    links.unshift({ id: 'telegram', label: 'Telegram', url: telegramUrl });
  }
  if (!links.length) return null;
  return (
    <div className={styles.links} role="group" aria-label="Социальные сети">
      {links.map((item) => (
        <a
          key={item.id}
          href={item.url!}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={item.label}
          title={item.label}
          className={styles.link}
        >
          <img
            src={withBase(`/icons/${item.id}.svg`)}
            alt=""
            width="24"
            height="24"
          />
        </a>
      ))}
    </div>
  );
}
