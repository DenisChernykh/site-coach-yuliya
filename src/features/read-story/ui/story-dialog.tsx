import type { CaseStudyDto } from '@/entities/site';
import { contentImageUrl } from '@/shared/lib/content-image';
import {
  Button,
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
}: {
  story: CaseStudyDto;
  mediaBaseUrl?: string;
}) {
  const reviewImage = contentImageUrl(story.reviewImage ?? '', mediaBaseUrl);
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="link"
            className="h-auto justify-start p-0 text-[13px] font-normal leading-[1.5]"
          />
        }
      >
        {story.review ? 'Читать историю и отзыв' : 'Читать историю'} ↗
      </DialogTrigger>
      <DialogContent className="max-h-[85svh] overflow-auto p-7 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-4xl leading-tight">
            {story.title}
          </DialogTitle>
          <DialogDescription>
            {story.format || 'Индивидуальная работа'} · без имени клиентки
          </DialogDescription>
        </DialogHeader>
        <p className="leading-relaxed">{story.details}</p>
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
        <p className="fine-print">
          Опыт индивидуален; одинаковый результат не гарантируется.
        </p>
      </DialogContent>
    </Dialog>
  );
}
