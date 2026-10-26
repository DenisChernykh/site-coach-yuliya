import {
  isMockMode,
  useGetHomePage,
  type HomePageDto,
  type StoryGroupDto,
} from '@/shared/api';
import { Stories } from './stories';

const selectStories = (home: HomePageDto) => home.stories ?? [];

export function StoriesFeed({
  demoStories = [],
  title = 'Сторис о моей работе',
  eyebrow = '',
}: {
  demoStories?: StoryGroupDto[];
  title?: string;
  eyebrow?: string;
}) {
  const query = useGetHomePage({
    query: {
      enabled: !isMockMode,
      select: selectStories,
      refetchOnReconnect: false,
    },
    request: { cache: 'no-store' },
  });
  const stories = isMockMode ? demoStories : query.data;
  if (
    !stories?.some(
      (group) => group.enabled && group.slides.some((slide) => slide.enabled),
    )
  )
    return null;

  return (
    <section
      id="stories"
      className="section-space"
      aria-labelledby="stories-title"
    >
      <div className="page-container">
        {eyebrow ? (
          <p className="eyebrow" style={{ whiteSpace: 'pre-line' }}>
            {eyebrow}
          </p>
        ) : null}
        <h2
          id="stories-title"
          className="mb-6 text-[32px] md:text-[40px]"
          style={{ whiteSpace: 'pre-line' }}
        >
          {title}
        </h2>
        <Stories stories={stories} />
      </div>
    </section>
  );
}
