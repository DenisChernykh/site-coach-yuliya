import type { FaqItemDto } from '@/entities/faq';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/shared/ui';

export function FaqList({ items }: { items: FaqItemDto[] }) {
  return (
    <Accordion defaultValue={items[0] ? [items[0].id] : []}>
      {items.map((item) => (
        <AccordionItem key={item.id} value={item.id} className="border-b">
          <AccordionTrigger className="gap-[18px] rounded-none py-5 text-base font-medium leading-[1.5] [&_svg]:size-5">
            {item.question}
          </AccordionTrigger>
          <AccordionContent className="pb-5 text-sm leading-[1.5] text-muted-foreground">
            {item.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
