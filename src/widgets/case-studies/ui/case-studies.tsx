import type { CaseStudyDto } from '@/entities/site';
import { StoryDialog } from '@/features/read-story';
import styles from './case-studies.module.css';

export function CaseStudies({
  items,
  mediaBaseUrl,
}: {
  items: CaseStudyDto[];
  mediaBaseUrl?: string;
}) {
  return (
    <div className={styles.grid}>
      {items
        .filter((item) => item.enabled !== false)
        .map((story, index) => (
          <article key={story.id} className={styles.card}>
            <p className={styles.number}>
              {String(index + 1).padStart(2, '0')}
              {story.format ? ` · ${story.format}` : ''}
            </p>
            <h3>{story.title}</h3>
            <dl>
              <div>
                <dt>С чем пришла</dt>
                <dd>{story.request}</dd>
              </div>
              <div>
                <dt>Что исследовали</dt>
                <dd>{story.exploration}</dd>
              </div>
              <div>
                <dt>Что изменилось</dt>
                <dd>{story.result}</dd>
              </div>
            </dl>
            <div className={styles.action}>
              <StoryDialog story={story} mediaBaseUrl={mediaBaseUrl} />
            </div>
          </article>
        ))}
    </div>
  );
}
