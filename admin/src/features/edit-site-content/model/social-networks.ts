import type { SocialLinkDto } from '@/shared/api'

export const networks: Record<SocialLinkDto['id'], string> = {
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  max: 'MAX',
  vk: 'ВКонтакте',
  ok: 'Одноклассники',
  instagram: 'Instagram',
  facebook: 'Facebook',
  threads: 'Threads',
  x: 'X (Twitter)',
  youtube: 'YouTube',
  rutube: 'Rutube',
  tiktok: 'TikTok',
  dzen: 'Дзен',
  linkedin: 'LinkedIn',
  pinterest: 'Pinterest',
  viber: 'Viber',
  discord: 'Discord',
  twitch: 'Twitch',
}

export const networkExamples: Record<SocialLinkDto['id'], string> = {
  telegram: 'https://t.me/username',
  whatsapp: 'https://wa.me/79991234567',
  max: 'https://max.ru/…',
  vk: 'https://vk.com/username',
  ok: 'https://ok.ru/profile/123456789',
  instagram: 'https://www.instagram.com/username/',
  facebook: 'https://www.facebook.com/username',
  threads: 'https://www.threads.com/@username',
  x: 'https://x.com/username',
  youtube: 'https://www.youtube.com/@username',
  rutube: 'https://rutube.ru/channel/12345678/',
  tiktok: 'https://www.tiktok.com/@username',
  dzen: 'https://dzen.ru/username',
  linkedin: 'https://www.linkedin.com/in/username/',
  pinterest: 'https://www.pinterest.com/username/',
  viber: 'https://invite.viber.com/…',
  discord: 'https://discord.gg/invite-code',
  twitch: 'https://www.twitch.tv/username',
}

export function isSocialUrl(value: string | null): boolean {
  if (!value || !/^https:\/\/\S+$/u.test(value)) return false
  try {
    return new URL(value).hostname.includes('.')
  } catch {
    return false
  }
}
