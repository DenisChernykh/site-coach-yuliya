import type { ContactDetailsDto, SocialLinkDto } from '@/shared/api'
import { networks } from './social-networks'

export function contactLinks(
  _contacts: ContactDetailsDto,
  socials: SocialLinkDto[],
): SocialLinkDto[] {
  return Object.entries(networks).map(([id, label]) => ({
    id: id as SocialLinkDto['id'],
    label: id === 'telegram' ? 'Telegram-канал' : label,
    url: socials.find((link) => link.id === id)?.url ?? null,
  }))
}
