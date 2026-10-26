import { Play, ArrowUpRight } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/shared/ui';

export function VideoIntroduction() {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            className="h-[58px] w-full justify-start gap-3.5 bg-background/95 px-[18px] text-[13px] font-normal leading-[1.5] hover:bg-background"
          />
        }
      >
        <Play aria-hidden="true" className="size-[19px]" /> Привет, я Юля. Давай
        знакомиться
      </DialogTrigger>
      <DialogContent className="p-7 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-4xl">
            Привет, я Юля.
          </DialogTitle>
          <DialogDescription className="leading-relaxed">
            Помогаю исследовать свои интересы, выбирать направление и
            проявляться в комфортном темпе.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Видеообращение появится здесь. А пока можно начать с короткого
          знакомства.
        </p>
        <DialogClose
          render={
            <Button
              data-consultation
              aria-haspopup="dialog"
              className="h-12 gap-5 px-6"
            />
          }
        >
          Давай познакомимся <ArrowUpRight aria-hidden="true" />
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
