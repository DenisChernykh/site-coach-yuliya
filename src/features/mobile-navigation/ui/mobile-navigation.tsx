import { useState } from 'react';
import { Menu, ArrowUpRight, X } from 'lucide-react';
import type { NavigationItemDto } from '@/entities/site';
import { routes, withBase } from '@/shared/routes';
import {
  Button,
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/shared/ui';

export function MobileNavigation({
  navigation,
  name,
}: {
  navigation: NavigationItemDto[];
  name: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className="-mr-2.5 size-11"
            aria-label="Открыть меню"
          />
        }
      >
        <Menu aria-hidden="true" className="size-6" />
      </SheetTrigger>
      <SheetContent
        className="w-full! max-w-full! gap-8 p-6 pt-10"
        showCloseButton={false}
      >
        <SheetHeader className="p-0">
          <SheetTitle className="font-heading text-[32px]">{name}</SheetTitle>
          <SheetDescription className="text-[10px] uppercase tracking-[0.12em]">
            Коуч по реализации и проявленности
          </SheetDescription>
        </SheetHeader>
        <SheetClose
          render={
            <Button
              variant="ghost"
              size="icon-lg"
              className="absolute right-5 top-5 size-11"
              aria-label="Закрыть меню"
            />
          }
        >
          <X aria-hidden="true" />
        </SheetClose>
        <nav aria-label="Мобильная навигация" className="flex flex-col">
          {navigation.map((item) => (
            <a
              key={item.href}
              href={withBase(item.href)}
              onClick={() => setOpen(false)}
              className="border-b py-5 font-heading text-[34px]"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <Button
          nativeButton={false}
          render={<a href={routes.contact} />}
          onClick={() => setOpen(false)}
          className="mt-4 h-14 justify-between px-6"
        >
          Давай познакомимся <ArrowUpRight aria-hidden="true" />
        </Button>
      </SheetContent>
    </Sheet>
  );
}
