import { ArrowUpRight } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/ui';

export function DocumentDialog({
  image,
  imageAlt,
  title,
  label = 'Посмотреть документ',
}: {
  image: string;
  imageAlt: string;
  title: string;
  label?: string;
}) {
  if (!image) return null;
  return (
    <Dialog>
      <DialogTrigger
        render={<Button variant="link" className="h-auto p-0 text-sm" />}
      >
        {label} <ArrowUpRight aria-hidden="true" className="size-4" />
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-auto p-5 sm:max-w-5xl sm:p-7">
        <DialogHeader>
          <DialogTitle className="pr-5 font-heading text-3xl">
            {title}
          </DialogTitle>
          <DialogDescription>
            Документ можно открыть в полном размере и увеличить в браузере.
          </DialogDescription>
        </DialogHeader>
        <img
          src={image}
          alt={imageAlt}
          className="max-h-[65svh] w-full object-contain"
        />
        <a
          href={image}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm underline underline-offset-4"
        >
          Открыть в полном размере ↗
        </a>
      </DialogContent>
    </Dialog>
  );
}
