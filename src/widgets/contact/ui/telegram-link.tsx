import { ArrowUpRight } from 'lucide-react';
import { Button, buttonVariants } from '@/shared/ui';

export function TelegramLink({ url }: { url?: string | null }) {
  return url ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonVariants() + ' h-14 w-fit gap-[18px] px-6 text-sm'}
    >
      Написать в Telegram <ArrowUpRight size={18} aria-hidden="true" />
    </a>
  ) : (
    <Button
      disabled
      className="h-14 w-fit gap-[18px] px-6 text-sm disabled:opacity-60"
    >
      Написать в Telegram{' '}
      <ArrowUpRight className="size-[18px]" aria-hidden="true" />
    </Button>
  );
}
