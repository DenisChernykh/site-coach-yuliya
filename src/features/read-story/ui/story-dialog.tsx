import type { CaseStudyDto } from '@/entities/site';
import {
  Button,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/ui';

export function StoryDialog({ story }: { story: CaseStudyDto }) {
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
        Читать историю ↗
      </DialogTrigger>
      <DialogContent className="max-h-[85svh] overflow-auto p-7 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-4xl leading-tight">
            {story.title}
          </DialogTitle>
          <DialogDescription>
            Обезличенная история из материалов Юли
          </DialogDescription>
        </DialogHeader>
        <p className="leading-relaxed">{story.details}</p>
        <p className="fine-print">
          Опыт индивидуален; одинаковый результат не гарантируется.
        </p>
      </DialogContent>
    </Dialog>
  );
}
