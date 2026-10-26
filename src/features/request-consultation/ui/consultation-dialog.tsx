import { useEffect, useRef, useState } from 'react';
import type { ServiceDto } from '@/entities/service';
import type { ConsultationRequestDto } from '@/shared/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui';
import { ConsultationForm } from './consultation-form';

export function ConsultationDialog({
  services,
  source,
}: {
  services: ServiceDto[];
  source: NonNullable<ConsultationRequestDto['source']>;
}) {
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState({ serviceId: '', topic: '' });
  const trigger = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function requestMeeting(event: MouseEvent) {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey
      )
        return;
      const button =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('[data-consultation]')
          : null;
      if (!button || button.closest('[data-preview-page]')) return;
      event.preventDefault();
      trigger.current = button;
      const serviceId = button.dataset.consultationService ?? '';
      setSelection({
        serviceId: services.some((service) => service.id === serviceId)
          ? serviceId
          : '',
        topic: button.dataset.consultationTopic ?? '',
      });
      setOpen(true);
    }
    document.addEventListener('click', requestMeeting);
    return () => document.removeEventListener('click', requestMeeting);
  }, [services]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-md p-6 sm:max-w-lg sm:p-8"
        finalFocus={() =>
          trigger.current?.isConnected
            ? trigger.current
            : document.querySelector<HTMLButtonElement>(
                '[aria-label="Открыть меню"]',
              )
        }
      >
        <DialogHeader className="pr-5">
          <DialogTitle className="text-[36px] leading-[1.05] sm:text-[42px]">
            Запись на бесплатную встречу
          </DialogTitle>
          <DialogDescription className="pt-1 leading-relaxed">
            30–60 минут по видеосвязи. Обсудим твою ситуацию и уточним запрос.
          </DialogDescription>
        </DialogHeader>
        <ConsultationForm
          services={services}
          source={source}
          serviceId={selection.serviceId}
          initialMessage={selection.topic}
          embedded
        />
      </DialogContent>
    </Dialog>
  );
}
