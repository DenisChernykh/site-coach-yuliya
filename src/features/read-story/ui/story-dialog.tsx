import type { ReactNode } from 'react';
import type { CaseStudyDto } from '@/entities/site';
import { contentImageUrl } from '@/shared/lib/content-image';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/ui';

export function StoryDialog({
  story,
  mediaBaseUrl,
  children,
  triggerClassName,
}: {
  story: CaseStudyDto;
  mediaBaseUrl?: string;
  children?: ReactNode;
  triggerClassName?: string;
}) {
  const reviewImage = contentImageUrl(story.reviewImage ?? '', mediaBaseUrl);
  return (
    <Dialog>
      <DialogTrigger
        className={triggerClassName}
        aria-label={`Открыть кейс: ${story.title}`}
      >
        {children ?? 'Открыть кейс ↗'}
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-auto rounded-md p-6 sm:max-w-xl sm:p-8">
        <DialogHeader className="pr-6">
          <DialogTitle className="font-heading text-4xl leading-tight">
            {story.title}
          </DialogTitle>
          <DialogDescription>
            {story.format
              ? `Индивидуальный коучинг · ${story.format}`
              : 'Индивидуальный коучинг'}
          </DialogDescription>
        </DialogHeader>
        <dl className="space-y-5">
          {[
            ['Запрос', story.request],
            ['Что разбирали', story.exploration],
            ['Результат', story.result],
          ].map(([label, text]) => (
            <div key={label}>
              <dt className="mb-1.5 text-sm font-semibold">{label}</dt>
              <dd className="m-0 whitespace-pre-line text-sm leading-relaxed">
                {text}
              </dd>
            </div>
          ))}
        </dl>
        {story.review && (
          <figure className="space-y-3 border-l-2 border-primary pl-5">
            <blockquote className="leading-relaxed">
              «{story.review}»
            </blockquote>
            <figcaption className="text-sm text-muted-foreground">
              Из отзыва клиентки
            </figcaption>
          </figure>
        )}
        {reviewImage && (
          <a
            href={reviewImage}
            target="_blank"
            rel="noopener noreferrer"
            className="space-y-3 text-sm underline underline-offset-4"
          >
            <img
              src={reviewImage}
              alt={story.reviewImageAlt || 'Отзыв клиентки'}
              loading="lazy"
              className="h-auto w-full rounded-md"
            />
            <span className="block">Открыть отзыв в полном размере ↗</span>
          </a>
        )}
      </DialogContent>
    </Dialog>
  );
}
