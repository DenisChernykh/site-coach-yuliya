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
