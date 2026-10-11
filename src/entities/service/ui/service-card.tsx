import { ArrowUpRight } from 'lucide-react';
import type { ServiceDto } from '@/shared/api';
import styles from './service-card.module.css';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/shared/ui';

export function ServiceCard({ service }: { service: ServiceDto }) {
  return (
    <Card
      className={`min-h-0 rounded-md bg-card p-6 ring-0 [--card-spacing:0px] has-data-[slot=card-footer]:pb-6 md:min-h-[480px] md:p-7 md:has-data-[slot=card-footer]:pb-7 ${styles.card}`}
    >
      <CardHeader className="gap-5 px-0">
        <p
          className={`eyebrow ${service.id === 'eight' ? 'max-md:text-[10px]' : ''}`}
        >
          {service.eyebrow}
        </p>
        <CardTitle>
          <h3 className="text-[32px] leading-[1.06] md:text-[36px]">
            {service.title}
          </h3>
        </CardTitle>
        <CardDescription className="whitespace-pre-line text-sm leading-[1.5]">
          {service.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-5 space-y-5 px-0">
        <div>
          <p className="font-heading text-[46px] leading-[1.06]">
            {new Intl.NumberFormat('ru-RU').format(service.price)} ₽
          </p>
          <p className="mt-0.5 text-xs leading-[1.5] text-muted-foreground">
            {service.priceNote}
          </p>
        </div>
        <ul className="space-y-[9px] text-[13px] leading-[1.5]">
          {service.features.map((feature) => (
            <li key={feature} className="flex gap-2">
              <span aria-hidden="true">—</span>
              {feature}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="mt-auto border-0 bg-transparent p-0 pt-5">
        <Button
          nativeButton={false}
          render={<a href={`?service=${service.id}#contact`} />}
          className="h-12 w-full gap-[18px] px-6 text-sm"
        >
          Обсудить формат{' '}
          <ArrowUpRight aria-hidden="true" className="size-[18px]" />
        </Button>
      </CardFooter>
    </Card>
  );
}
