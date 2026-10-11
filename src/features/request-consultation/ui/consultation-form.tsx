import { useEffect, useId, useRef, useState, type SubmitEvent } from 'react';
import { ArrowUpRight, Check, LoaderCircle } from 'lucide-react';
import type { ServiceDto } from '@/entities/service';
import { useCreateConsultation } from '@/shared/api';
import { getConsultationErrorMessage } from '../model/errors';
import { routes } from '@/shared/routes';
import {
  Button,
  Card,
  CardContent,
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
  Input,
  Textarea,
  Checkbox,
  Alert,
  AlertDescription,
} from '@/shared/ui';

type FieldName = 'name' | 'contact' | 'consent';
type Errors = Partial<Record<FieldName, string>>;

export function ConsultationForm({ services }: { services: ServiceDto[] }) {
  const id = useId();
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [serviceId, setServiceId] = useState<string>();
  const mutation = useCreateConsultation();
  const successRef = useRef<HTMLDivElement>(null);
  const consentRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get(
      'service',
    );
    if (services.some((service) => service.id === requested))
      setServiceId(requested!);
  }, [services]);
  useEffect(() => {
    if (mutation.isSuccess) successRef.current?.focus();
  }, [mutation.isSuccess]);

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const name = String(values.get('name') ?? '').trim();
    const contact = String(values.get('contact') ?? '').trim();
    const message = String(values.get('message') ?? '').trim();
    const website = String(values.get('website') ?? '');
    const nextErrors: Errors = {};
    if (name.length < 2)
      nextErrors.name = 'Напиши своё имя — хотя бы два символа.';
    if (contact.length < 5)
      nextErrors.contact = 'Укажи телефон или имя в Telegram.';
    if (!consent) nextErrors.consent = 'Для заявки нужно твоё согласие.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const first = Object.keys(nextErrors)[0]!;
      if (first === 'consent') consentRef.current?.focus();
      else form.querySelector<HTMLElement>(`[id="${id}-${first}"]`)?.focus();
      return;
    }
    mutation.mutate({
      data: { name, contact, message, website, consent: true, serviceId },
    });
  }

  const selectedService = services.find((service) => service.id === serviceId);
  if (mutation.isSuccess) {
    return (
      <Card className="rounded-md p-5 ring-0 md:p-8">
        <CardContent className="space-y-5 p-0">
          <div
            ref={successRef}
            tabIndex={-1}
            role="status"
            className="space-y-5 outline-none"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-secondary">
              <Check aria-hidden="true" className="size-5" />
            </span>
            <h3 className="font-heading text-4xl">
              {mutation.data.status === 'preview'
                ? 'Форма заполнена'
                : 'Заявка отправлена'}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {mutation.data.message}
            </p>
          </div>
          <Button
            variant="outline"
            className="h-12 px-5"
            onClick={() => {
              mutation.reset();
              setConsent(false);
              setErrors({});
            }}
          >
            Заполнить ещё раз
          </Button>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="rounded-md p-5 ring-0 md:p-8">
      <CardContent className="p-0">
        <form onSubmit={submit} noValidate aria-label="Заявка на знакомство">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-[10000px] h-px w-px overflow-hidden"
          >
            <label htmlFor={`${id}-website`}>Сайт</label>
            <input
              id={`${id}-website`}
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              maxLength={2000}
            />
          </div>
          <h3 className="mb-[18px] font-sans text-lg font-medium leading-[1.5]">
            Или оставь пару слов о себе
          </h3>
          {selectedService ? (
            <p className="mb-5 text-sm text-muted-foreground">
              Интересует: {selectedService.title}
            </p>
          ) : null}
          <FieldGroup className="gap-[18px]">
            <Field data-invalid={Boolean(errors.name)} className="gap-1.5">
              <FieldLabel
                htmlFor={`${id}-name`}
                className="text-xs font-normal leading-[1.5]"
              >
                Как тебя зовут
              </FieldLabel>
              <Input
                id={`${id}-name`}
                name="name"
                placeholder="Имя"
                autoComplete="given-name"
                required
                minLength={2}
                maxLength={80}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? `${id}-name-error` : undefined}
                className="h-12 rounded-md bg-background px-3.5 text-[13px] leading-[1.5]"
              />
              {errors.name ? (
                <FieldError id={`${id}-name-error`}>{errors.name}</FieldError>
              ) : null}
            </Field>
            <Field data-invalid={Boolean(errors.contact)} className="gap-1.5">
              <FieldLabel
                htmlFor={`${id}-contact`}
                className="text-xs font-normal leading-[1.5]"
              >
                Где удобно связаться
              </FieldLabel>
              <Input
                id={`${id}-contact`}
                name="contact"
                placeholder="Телефон или @telegram"
                autoComplete="off"
                required
                maxLength={120}
                aria-invalid={Boolean(errors.contact)}
                aria-describedby={
                  errors.contact ? `${id}-contact-error` : undefined
                }
                className="h-12 rounded-md bg-background px-3.5 text-[13px] leading-[1.5]"
              />
              {errors.contact ? (
                <FieldError id={`${id}-contact-error`}>
                  {errors.contact}
                </FieldError>
              ) : null}
            </Field>
            <Field className="gap-1.5">
              <FieldLabel
                htmlFor={`${id}-message`}
                className="text-xs font-normal leading-[1.5]"
              >
                Что хочется обсудить
              </FieldLabel>
              <Textarea
                id={`${id}-message`}
                name="message"
                placeholder="Можно пока не знать точный запрос"
                maxLength={2000}
                className="min-h-[76px] rounded-md bg-background px-3.5 py-3 text-[13px] leading-[1.5]"
              />
            </Field>
            <Field data-invalid={Boolean(errors.consent)} className="gap-2">
              <div className="flex items-start gap-2.5">
                <Checkbox
                  ref={consentRef}
                  id={`${id}-consent`}
                  checked={consent}
                  onCheckedChange={setConsent}
                  aria-labelledby={`${id}-consent-label`}
                  aria-invalid={Boolean(errors.consent)}
                  aria-describedby={
                    errors.consent ? `${id}-consent-error` : undefined
                  }
                  className="size-4"
                />
                <FieldLabel
                  id={`${id}-consent-label`}
                  htmlFor={`${id}-consent`}
                  className="block text-[10px] font-normal leading-[1.5]"
                >
                  Согласна на обработку персональных данных
                  <br className="hidden sm:block" /> и ознакомилась с{' '}
                  <a
                    href={routes.privacy}
                    className="underline underline-offset-2"
                  >
                    политикой конфиденциальности
                  </a>
                  .
                </FieldLabel>
              </div>
              {errors.consent ? (
                <FieldError id={`${id}-consent-error`}>
                  {errors.consent}
                </FieldError>
              ) : null}
            </Field>
            {mutation.isError ? (
              <Alert variant="destructive">
                <AlertDescription>
                  {getConsultationErrorMessage(mutation.error)}
                </AlertDescription>
              </Alert>
            ) : null}
            <Button
              type="submit"
              disabled={mutation.isPending}
              aria-busy={mutation.isPending}
              className="h-[50px] w-full gap-[18px] px-6 text-sm"
            >
              {mutation.isPending ? 'Отправляем…' : 'Отправить заявку'}
              {mutation.isPending ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin"
                />
              ) : (
                <ArrowUpRight aria-hidden="true" className="size-[18px]" />
              )}
            </Button>
            <p className="fine-print">
              Запись не обязывает покупать сессии или пакет.
            </p>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
